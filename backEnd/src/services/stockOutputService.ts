import { StockOutputRepository } from "../repository/stockOutputRepository";
import { MovementContext, normalizeMovementItems, registerStockMovement, reverseStockMovement } from "./stockMovementService";

export class StockOutputService {
  private stockOutputRepository = new StockOutputRepository();

  async findById(companyId: number, id: number) {
    return this.stockOutputRepository.findById(companyId, id);
  }

  async findAll(companyId: number) {
    return await this.stockOutputRepository.findAll(companyId);
  }

  // Corpo da API: { stockOutput: { observation }, products: [{ productId, productQuantity }] }.
  // Empresa e autor vêm do token; um userId enviado no corpo é ignorado.
  async output(context: MovementContext, newStockOutput: any) {
    const items = normalizeMovementItems("output", (newStockOutput?.products ?? []).map((item: any) => ({
      productId: item?.productId,
      quantity: item?.productQuantity,
    })));
    const observation = typeof newStockOutput?.stockOutput?.observation === "string" && newStockOutput.stockOutput.observation.trim()
      ? newStockOutput.stockOutput.observation.trim()
      : null;

    const movement = await registerStockMovement("output", context, items, observation);
    return { stockOutputId: movement.movementId };
  }

  // Estorno: registra uma entrada com os mesmos produtos, ligada a esta saída.
  async reverse(context: MovementContext, id: number) {
    const movement = await reverseStockMovement("output", context, id);
    return { stockInputId: movement.movementId, reversesOutputId: id };
  }

  async delete(companyId: number, id: number) {
    return await this.stockOutputRepository.delete(companyId, id);
  }
}
