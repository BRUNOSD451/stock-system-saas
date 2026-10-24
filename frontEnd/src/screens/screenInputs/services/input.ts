import { apiController } from "../../../services/Api";
import type { InputItem, Product, StockInput, StockInputDetalhado } from "../../../resources/types/types";

export interface StockInputPayload {
  stockInput: { userId: number; observation: string | null; };
  products: { productId: number; productQuantity: number; }[];
}

export function getStockInputs() {
  return apiController.get<StockInput[]>("/stockInputs");
}

export function getInputItems() {
  return apiController.get<InputItem[]>("/inputItems");
}

export function getProducts() {
  return apiController.get<Product[]>("/products");
}

export function createStockInput(payload: StockInputPayload) {
  return apiController.post<StockInput>("/stockInputs/input", payload);
}

// Estorno: o backend registra uma saída com os mesmos produtos, ligada a esta entrada.
export function reverseStockInput(id: number) {
  return apiController.post<{ stockOutputId: number; reversesInputId: number }>(`/stockInputs/${id}/reverse`, {});
}

export function deleteStockInput(id: number) {
  return apiController.delete<StockInput>(`/stockInputs/${id}`);
}

export function getStockInput(id: number) {
  return apiController.get<StockInputDetalhado>(`/stockInputs/${id}`);
}
