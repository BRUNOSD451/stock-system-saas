import { ProductsRepository } from "../repository/productsRepository";
import { AppError } from "../utils/errors";
import { adjustStock, MovementContext } from "./stockMovementService";

// Unidades de medida aceitas; as quantidades continuam inteiras (ex.: 3 sc, 12 kg).
export const PRODUCT_UNITS = ["un", "kg", "g", "L", "mL", "m", "cx", "sc", "pct", "par"] as const;

// Código (SKU ou código de barras): texto livre, único por empresa; vazio vira "sem código".
function normalizeSku(value: unknown) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== "string") throw new AppError("Informe o código como texto.");
    const sku = value.trim();
    if (sku.length > 60) throw new AppError("O código deve ter até 60 caracteres.");
    return sku || null;
}

function normalizeUnit(value: unknown) {
    if (value === undefined) return undefined;
    if (typeof value !== "string" || !(PRODUCT_UNITS as readonly string[]).includes(value)) {
        throw new AppError("Selecione uma unidade de medida válida.");
    }
    return value;
}

export class ProductsService{

private productsRepository = new ProductsRepository()

async findAll(companyId: number){

    return await this.productsRepository.findAll(companyId)

}

async create(companyId: number, newProduct:any){
    const sku = normalizeSku(newProduct.sku);
    const unit = normalizeUnit(newProduct.unit);
    return await this.productsRepository.create(companyId, { ...newProduct, sku: sku ?? null, unit: unit ?? "un" })

}

async delete(companyId: number, id:number){

    return await this.productsRepository.delete(companyId, id)

}

// O saldo não muda por edição: depois do cadastro, só por movimentação ou ajuste de inventário,
// para o histórico sempre explicar o estoque. stockQuantity enviado aqui é ignorado.
async update(companyId: number, updateData:any, id:number){
    const { stockQuantity: _stockQuantity, active: _active, ...data } = updateData ?? {};
    const sku = normalizeSku(data.sku);
    const unit = normalizeUnit(data.unit);
    return await this.productsRepository.update(companyId, {
        ...data,
        ...(sku !== undefined ? { sku } : {}),
        ...(unit !== undefined ? { unit } : {}),
    }, id)

}

// Inativo: some das listas de movimentação e da reposição, mas mantém o histórico.
async setActive(companyId: number, id: number, active: unknown){
    if (typeof active !== "boolean") throw new AppError("Informe se o produto fica ativo ou inativo.");
    return await this.productsRepository.setActive(companyId, id, active)
}

async adjust(context: MovementContext, id: number, data: any){
    const countedQuantity = Number(data?.countedQuantity);
    const reason = typeof data?.reason === "string" ? data.reason.trim() : "";
    return await adjustStock(context, id, countedQuantity, reason)
}

}
