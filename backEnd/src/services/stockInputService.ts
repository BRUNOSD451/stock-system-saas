import { StockInputRepository } from "../repository/stockInputRepository";
import { MovementContext, normalizeMovementItems, registerStockMovement, reverseStockMovement } from "./stockMovementService";

export class StockInputService {
    private stockInputRepository = new StockInputRepository();

    async findById(companyId: number, id: number) {
        return this.stockInputRepository.findById(companyId, id);
    }

    async findAll(companyId: number) {
        return await this.stockInputRepository.findAll(companyId);
    }

    // Corpo da API: { stockInput: { observation }, products: [{ productId, productQuantity }] }.
    // Empresa e autor vêm do token; um userId enviado no corpo é ignorado.
    async input(context: MovementContext, newStockInput: any) {
        const items = normalizeMovementItems("input", (newStockInput?.products ?? []).map((item: any) => ({
            productId: item?.productId,
            quantity: item?.productQuantity,
            unitPrice: item?.unitPrice,
        })));
        const observation = typeof newStockInput?.stockInput?.observation === "string" && newStockInput.stockInput.observation.trim()
            ? newStockInput.stockInput.observation.trim()
            : null;

        const movement = await registerStockMovement("input", context, items, observation);
        const created = await this.stockInputRepository.findById(context.companyId, movement.movementId);
        const { items: _items, ...stockInput } = created;
        return stockInput;
    }

    // Estorno: registra uma saída com os mesmos produtos, ligada a esta entrada.
    async reverse(context: MovementContext, id: number) {
        const movement = await reverseStockMovement("input", context, id);
        return { stockOutputId: movement.movementId, reversesInputId: id };
    }

    async delete(companyId: number, id: number) {
        return await this.stockInputRepository.delete(companyId, id);
    }
}
