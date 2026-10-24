import { OutputItemRepository } from "../repository/outputItemRepository";

export class OutputItemService {
    private outputItemRepository = new OutputItemRepository();

    async findAll(companyId: number) {
        return await this.outputItemRepository.findAll(companyId);
    }
}
