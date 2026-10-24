import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "../database/db";
import { createAccessToken } from "../config/jwt";
import { CompaniesRepository } from "../repository/companiesRepository";
import { AppError } from "../utils/errors";
import type { companyInterface } from "../config/types";
import { resolveAccess } from "../config/plans";

const BCRYPT_ROUNDS = 12;
const TRIAL_DAYS = 14;

// Mesmo contrato enviado pela tela /signup do frontend.
export const signupSchema = z.object({
  companyName: z.string().trim().min(2, "Informe o nome da empresa.").max(150, "O nome da empresa deve ter até 150 caracteres."),
  userName: z.string().trim().min(2, "Informe seu nome.").max(120, "O nome deve ter até 120 caracteres."),
  email: z.string().trim().toLowerCase().max(150, "O e-mail deve ter até 150 caracteres.").pipe(z.email("Informe um e-mail válido.")),
  userCellNumber: z.string().transform((value) => value.replace(/\D/g, "")).refine((digits) => digits.length === 10 || digits.length === 11, "Informe um celular com DDD."),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres.").max(72, "A senha deve ter até 72 caracteres."),
});

export type SignupInput = z.input<typeof signupSchema>;

// Campos editáveis na tela Empresa. Chegam como texto (multipart), por isso o limite é convertido.
export const companyUpdateSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da empresa.").max(150, "O nome da empresa deve ter até 150 caracteres.").optional(),
  email: z.string().trim().toLowerCase().max(150, "O e-mail deve ter até 150 caracteres.").pipe(z.email("Informe um e-mail válido.")).optional(),
  // Texto vazio não pode virar 0 em silêncio: é tratado como valor inválido.
  lowStockThreshold: z.preprocess(
    (value) => (value === "" ? Number.NaN : value),
    z.coerce.number({ error: "Informe o limite de estoque baixo." })
      .int("O limite de estoque baixo deve ser um número inteiro.")
      .min(0, "O limite de estoque baixo não pode ser negativo.")
      .max(1000000, "O limite de estoque baixo deve ser até 1.000.000."),
  ).optional(),
  removeLogo: z.enum(["true", "false"]).optional(),
});

// Dados públicos da empresa para o frontend (sem ownerUserId), com a situação da assinatura.
export function toPublicCompany(company: companyInterface) {
  const { trialExpired, periodEnded, readOnly } = resolveAccess(company);
  return {
    companyId: company.companyId,
    name: company.name,
    email: company.email,
    logoUrl: company.logoUrl,
    plan: company.plan,
    status: company.status,
    trialEndsAt: company.trialEndsAt,
    currentPeriodEnd: company.currentPeriodEnd,
    lowStockThreshold: Number(company.lowStockThreshold),
    createdAt: company.createdAt,
    trialExpired,
    periodEnded,
    readOnly,
  };
}

function isDuplicateEntry(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "ER_DUP_ENTRY";
}

export class CompaniesService {
  private companiesRepository = new CompaniesRepository();

  async signup(input: SignupInput) {
    const parsed = signupSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Dados de cadastro inválidos.", 400);
    }
    const data = parsed.data;

    const password = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

    try {
      const { company, owner } = await db.transaction(async (connection) => {
        const companyId = await this.companiesRepository.createOn(connection, { name: data.companyName, email: data.email, trialEndsAt });
        const owner = await this.companiesRepository.createOwnerOn(connection, companyId, {
          userName: data.userName,
          userCellNumber: data.userCellNumber,
          password,
        });
        const company = await this.companiesRepository.setOwnerOn(connection, companyId, owner.userId);
        return { company, owner };
      });

      // Mesma resposta do login, para o frontend entrar direto após o cadastro.
      const { password: _password, ...user } = owner;
      const token = createAccessToken({
        userId: owner.userId,
        userCellNumber: owner.userCellNumber,
        companyId: company.companyId,
        role: owner.userPosition,
      });
      return { token, user, company: toPublicCompany(company) };
    } catch (error: unknown) {
      if (isDuplicateEntry(error)) {
        throw new AppError("Este celular já está cadastrado. Entre com ele ou use outro número.", 409);
      }
      throw error;
    }
  }

  async getMine(companyId: number) {
    return toPublicCompany(await this.companiesRepository.findById(companyId));
  }

  // logoUrl vem do upload feito pelo controller; removeLogo apaga a logo atual.
  async updateMine(companyId: number, input: unknown, logoUrl?: string) {
    const parsed = companyUpdateSchema.safeParse(input ?? {});
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Dados da empresa inválidos.", 400);
    }
    const { removeLogo, ...data } = parsed.data;
    const company = await this.companiesRepository.update(companyId, {
      ...data,
      ...(logoUrl ? { logoUrl } : removeLogo === "true" ? { logoUrl: null } : {}),
    });
    return toPublicCompany(company);
  }
}
