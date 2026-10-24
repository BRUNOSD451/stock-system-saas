import { UserRepository } from "../repository/userRepository";
import { db } from "../database/db";
import { userInterface } from "../config/types";
import bcrypt from "bcryptjs";
import { createAccessToken } from "../config/jwt";
import { AppError } from "../utils/errors";
import { generateTemporaryPassword } from "../utils/temporaryPassword";
import { resolveAccess } from "../config/plans";

const BCRYPT_ROUNDS = 12;

type PublicUser = Omit<userInterface, "password" | "mustChangePassword" | "tokenVersion"> & { mustChangePassword: boolean };

const ROLES = ["administrador", "supervisor", "funcionario"];

// Mesma resposta para celular inexistente e senha errada: não revela quais contas existem.
const INVALID_LOGIN = "Celular ou senha incorretos.";
// Hash usado quando o celular não existe, para a resposta levar o mesmo tempo de uma senha errada.
const DUMMY_HASH = bcrypt.hashSync("stockcontrol-dummy-password", BCRYPT_ROUNDS);

function assertRole(role: unknown) {
    if (typeof role !== "string" || !ROLES.includes(role)) {
        throw new AppError("Selecione um cargo válido.", 400);
    }
}

const MIN_PASSWORD_LENGTH = 8;
// bcrypt considera só os primeiros 72 bytes.
const MAX_PASSWORD_LENGTH = 72;

function withoutPassword(user: userInterface): PublicUser {
    // O hash é necessário para autenticar, mas nunca deve sair nas respostas da API.
    const { password: _password, mustChangePassword, tokenVersion: _tokenVersion, ...publicUser } = user;
    return { ...publicUser, mustChangePassword: Boolean(Number(mustChangePassword)) };
}

function isDuplicateEntry(error: unknown) {
    return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "ER_DUP_ENTRY";
}

export class UserService{
private userRepository = new UserRepository()

async findAll(companyId: number){
    const users = await this.userRepository.findAll(companyId);
    return users.map(withoutPassword);
}

// A empresa do novo usuário é sempre a de quem está criando; companyId do body é ignorado.
// O administrador não escolhe a senha: o sistema gera uma provisória, mostrada uma única vez,
// e a pessoa cria a dela no primeiro acesso.
async create(companyId: number, userdata:any){
    assertRole(userdata?.userPosition);
    const temporaryPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);
    try {
        const user = await this.userRepository.create(companyId, {
            userName: userdata.userName,
            userCellNumber: userdata.userCellNumber,
            userPosition: userdata.userPosition,
            imageUrl: userdata.imageUrl,
            password: hashedPassword,
            mustChangePassword: true,
        } as userInterface);
        return { user: withoutPassword(user), temporaryPassword };
    } catch (error: unknown) {
        if (isDuplicateEntry(error)) throw new AppError("Este celular já tem uma conta no StockControl.", 409);
        throw error;
    }
}

// Gera nova senha provisória para alguém da equipe; a senha anterior deixa de funcionar.
async resetPassword(companyId: number, requesterId: number, id: number){
    if (requesterId === id) {
        throw new AppError("Para trocar a sua própria senha, use a opção de alterar senha.", 400);
    }
    const temporaryPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);
    const user = await this.userRepository.setPassword(companyId, id, hashedPassword, true);
    return { user: withoutPassword(user), temporaryPassword };
}

// A pessoa define a própria senha. Exige a senha atual (ou a provisória) e devolve um token novo,
// já sem a obrigação de troca.
async changeOwnPassword(companyId: number, userId: number, data: any){
    const currentPassword = typeof data?.currentPassword === "string" ? data.currentPassword : "";
    const newPassword = typeof data?.newPassword === "string" ? data.newPassword : "";

    if (newPassword.length < MIN_PASSWORD_LENGTH) throw new AppError(`A nova senha deve ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.`, 400);
    if (newPassword.length > MAX_PASSWORD_LENGTH) throw new AppError(`A nova senha deve ter até ${MAX_PASSWORD_LENGTH} caracteres.`, 400);

    const user = await this.userRepository.findById(companyId, userId);
    if (!currentPassword || !(await bcrypt.compare(currentPassword, user.password))) {
        throw new AppError("A senha atual está incorreta.", 400);
    }
    if (await bcrypt.compare(newPassword, user.password)) {
        throw new AppError("A nova senha precisa ser diferente da atual.", 400);
    }

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    const updated = await this.userRepository.setPassword(companyId, userId, hashedPassword, false);
    const token = createAccessToken({
        userId: updated.userId,
        userCellNumber: updated.userCellNumber,
        companyId,
        role: updated.userPosition,
        mustChangePassword: false,
        tokenVersion: Number(updated.tokenVersion ?? 0),
    });
    return { token, user: withoutPassword(updated) };
}

// Ninguém exclui a si mesmo: evita que a empresa fique sem administrador por engano.
async delete(companyId: number, requesterId: number, id:number){
    if (requesterId === id) throw new AppError("Você não pode excluir o seu próprio usuário.", 400);
    return this.userRepository.delete(companyId, id)
}

// Edição de cadastro não troca senha: isso só acontece por resetPassword ou changeOwnPassword.
async update(companyId: number, updateData:any , id:number, requesterId?: number){
    const { password: _password, ...data } = updateData ?? {};

    if (data.userPosition !== undefined) {
        assertRole(data.userPosition);
        // O próprio cargo não muda por aqui: impede que o único administrador se rebaixe.
        if (requesterId === id) {
            const current = await this.userRepository.findById(companyId, id);
            if (current.userPosition !== data.userPosition) {
                throw new AppError("Você não pode alterar o seu próprio cargo.", 400);
            }
        }
    }

    const user = await this.userRepository.update(companyId, data, id);
    return withoutPassword(user);
}

async login(data:any){
        const queryText = `SELECT
            u.user_id AS userId,
            u.company_id AS companyId,
            u.user_name AS userName,
            u.user_cell_number AS userCellNumber,
            u.user_position AS userPosition,
            u.image_url AS imageUrl,
            u.password,
            u.must_change_password AS mustChangePassword,
            u.token_version AS tokenVersion,
            c.name AS companyName,
            c.plan AS companyPlan,
            c.status AS companyStatus,
            c.trial_ends_at AS companyTrialEndsAt,
            c.current_period_end AS companyCurrentPeriodEnd,
            c.email AS companyEmail,
            c.logo_url AS companyLogoUrl,
            c.low_stock_threshold AS companyLowStockThreshold
            FROM users u
            LEFT JOIN companies c ON c.company_id = u.company_id
            WHERE u.user_cell_number = ?`;
    const cellNumber = typeof data?.userCellNumber === "string" ? data.userCellNumber.replace(/\D/g, "") : "";
    const password = typeof data?.password === "string" ? data.password : "";
    if (!cellNumber || !password) throw new AppError(INVALID_LOGIN, 401);

    const result = await db.query(queryText, [cellNumber]);
    const row = result.rows[0];

    // Compara mesmo sem usuário, para o tempo de resposta não indicar se o celular existe.
    const passwordMatches = await bcrypt.compare(password, row?.password ?? DUMMY_HASH);
    if (!row || !passwordMatches) {
        throw new AppError(INVALID_LOGIN, 401);
    }

    // Sem empresa não há como isolar os dados; o acesso fica bloqueado até o vínculo ser corrigido.
    if (typeof row.companyId !== "number") {
        throw new AppError("Este usuário não está vinculado a nenhuma empresa. Fale com o administrador.", 403);
    }

    const { companyName, companyPlan, companyStatus, companyTrialEndsAt, companyCurrentPeriodEnd, companyEmail, companyLogoUrl, companyLowStockThreshold, ...userRow } = row;
    const publicUser = withoutPassword(userRow as userInterface);
    // Login segue liberado com assinatura inativa: a pessoa entra em modo de consulta.
    const { trialExpired, periodEnded, readOnly } = resolveAccess({
        plan: companyPlan, status: companyStatus, trialEndsAt: companyTrialEndsAt, currentPeriodEnd: companyCurrentPeriodEnd,
    });
    const token = createAccessToken({
        userId: row.userId,
        userCellNumber: row.userCellNumber,
        companyId: row.companyId,
        role: row.userPosition,
        mustChangePassword: Boolean(Number(row.mustChangePassword)),
        tokenVersion: Number(row.tokenVersion ?? 0),
    });

    return {
        token,
        user: publicUser,
        company: {
            companyId: row.companyId,
            name: companyName,
            email: companyEmail,
            logoUrl: companyLogoUrl,
            plan: companyPlan,
            status: companyStatus,
            trialEndsAt: companyTrialEndsAt,
            currentPeriodEnd: companyCurrentPeriodEnd,
            lowStockThreshold: Number(companyLowStockThreshold),
            trialExpired,
            periodEnded,
            readOnly,
        },
    };

}

}
