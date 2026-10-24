import { dashboardRepository } from "../repository/dashboardRepository";

class DashboardService {
  async getDataDashboard(companyId: number) {
    const [summary, movements, entries, outputs] = await Promise.all([
      dashboardRepository.getSumary(companyId),
      dashboardRepository.getMovements(companyId),
      dashboardRepository.getEntries(companyId),
      dashboardRepository.getOutputs(companyId),
    ]);
    return { ...summary, movements, entries, outputs };
  }
}

export const dashboardService = new DashboardService();
