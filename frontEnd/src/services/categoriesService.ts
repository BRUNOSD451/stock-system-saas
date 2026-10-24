import type { Category } from "../resources/types/types";
import { apiController } from "./Api";

class CategoryServiceClass {


  async create(data: Omit<Category, "categoryId">): Promise<Category> {
    return apiController.post<Category>("/categories/create", data);
  }


  async getAll(): Promise<Category[]> {
    return apiController.get<Category[]>("/categories");
  }


  async delete(id: number): Promise<void> {
    await apiController.delete<void>(`/categories/${id}`);
  }


  async update(id: number, data: Partial<Category>): Promise<Category> {
    return apiController.patch<Category>(`/categories/update/${id}`, data);
  }
}


export const CategoryService = new CategoryServiceClass();