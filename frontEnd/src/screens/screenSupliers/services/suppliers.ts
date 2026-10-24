
import { apiController } from "../../../services/Api";
import type { Supplier } from "../../../resources/types/types";

export class supplierService {

  async create(data: Omit<Supplier, "supplierId">): Promise<Supplier> {
    return apiController.post<Supplier>("/suppliers/create", data);
  }

  async getAll(): Promise<Supplier[]> {

    return apiController.get<Supplier[]>("/suppliers");
  }

  async delete(id: number): Promise<void> {
    await apiController.delete(`/suppliers/${id}`);
  }

  async update(data: Partial<Omit<Supplier, "supplierId">>, id: number): Promise<Supplier> {
    return apiController.patch<Supplier>(`/suppliers/update/${id}`, data);
  }
}

export const SupplierService = new supplierService();
