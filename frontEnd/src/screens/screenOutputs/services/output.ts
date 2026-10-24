import { apiController } from "../../../services/Api";
import type { OutputItem, Product, StockOutput, StockOutputDetalhado } from "../../../resources/types/types";

export interface StockOutputPayload {
  stockOutput: { userId: number; observation: string | null; };
  products: { productId: number; productQuantity: number; }[];
}

export function getStockOutputs() {
  return apiController.get<StockOutput[]>("/stockOutputs");
}

export function getOutputItems() {
  return apiController.get<OutputItem[]>("/outputItems");
}

export function getProducts() {
  return apiController.get<Product[]>("/products");
}

export function createStockOutput(payload: StockOutputPayload) {
  return apiController.post<{ stockOutputId: number; }>("/stockOutputs/output", payload);
}

// Estorno: o backend registra uma entrada com os mesmos produtos, ligada a esta saída.
export function reverseStockOutput(id: number) {
  return apiController.post<{ stockInputId: number; reversesOutputId: number }>(`/stockOutputs/${id}/reverse`, {});
}

export function deleteStockOutput(id: number) {
  return apiController.delete<StockOutput>(`/stockOutputs/${id}`);
}

export function getStockOutput(id: number) {
  return apiController.get<StockOutputDetalhado>(`/stockOutputs/${id}`);
}
