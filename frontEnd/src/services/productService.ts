

import type { Product } from "../resources/types/types"
import { apiController } from "./Api"

export interface StockAdjustment {
    movementId: number;
    type: "input" | "output";
    productId: number;
    name: string;
    previousStock: number;
    newStock: number;
    difference: number;
}

// Unidades aceitas pelo backend (PRODUCT_UNITS em productsServices.ts).
export const PRODUCT_UNITS = [
    { value: "un", label: "Unidade (un)" },
    { value: "kg", label: "Quilo (kg)" },
    { value: "g", label: "Grama (g)" },
    { value: "L", label: "Litro (L)" },
    { value: "mL", label: "Mililitro (mL)" },
    { value: "m", label: "Metro (m)" },
    { value: "cx", label: "Caixa (cx)" },
    { value: "sc", label: "Saco (sc)" },
    { value: "pct", label: "Pacote (pct)" },
    { value: "par", label: "Par" },
]

export const isActiveProduct = (product: Pick<Product, "active">) => product.active === undefined || Boolean(Number(product.active))
export const unitLabel = (product: Pick<Product, "unit">) => product.unit || "un"
class productService{

private toFormData(data: Omit<Product, "productId" | "createdAt">, image?: File | null) {
    const formData = new FormData();

    formData.append("name", data.name);
    formData.append("sku", data.sku || "");
    formData.append("unit", data.unit || "un");
    formData.append("description", data.description || "");
    formData.append("price", String(data.price));
    formData.append("stockQuantity", String(data.stockQuantity));
    formData.append("categoryId", String(data.categoryId));
    formData.append("supplierId", data.supplierId === null ? "" : String(data.supplierId));

    if (image) {
        formData.append("image", image);
    }

    return formData;
}

async create(data:Omit<Product, "productId" | "createdAt">, image?: File | null):Promise<Product>{
    return apiController.postForm<Product>("/products/create", this.toFormData(data, image))
}


async getAll():Promise<Product[]>{
    return apiController.get<Product[]>("/products")
}


async delete(id:number):Promise<void>{

    await apiController.delete(`/products/${id}`)

}


async update(data:Partial<Omit<Product, "productId" | "createdAt">>, id:number, image?: File | null):Promise<Product>{
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
            formData.append(key, value === null ? "" : String(value));
        }
    });
    if (image) {
        formData.append("image", image);
    }
    return apiController.request<Product>(`/products/update/${id}`, { method: "PATCH", body: formData })

}

// Inativo some das listas de movimentação e da reposição, mas mantém o histórico.
async setActive(id: number, active: boolean): Promise<Product> {
    return apiController.patch<Product>(`/products/${id}/status`, { active })
}

// Ajuste de inventário: informa a quantidade contada; o sistema registra a diferença.
async adjust(id: number, countedQuantity: number, reason: string): Promise<StockAdjustment> {
    return apiController.post<StockAdjustment>(`/products/${id}/adjust`, { countedQuantity, reason })
}


}


export const ProductService = new productService()