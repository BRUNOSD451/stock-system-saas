import { apiController } from "../../../services/Api";

export interface DashboardData {
  products: number;
  inStock: number;
  lowStock: number;
  stockValue: number;
  entries: { today: number; month: number };
  outputs: { today: number; month: number };
  movements: { day: string; entries: number; outputs: number }[];
}

export function getDashboardData(): Promise<DashboardData> {
  return apiController.get<DashboardData>("/dashboard");
}
