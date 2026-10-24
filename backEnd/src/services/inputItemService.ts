import { InputItemRepository } from "../repository/inputItemRepository";

export class InputItemService {
    private inputItemRepository = new InputItemRepository();

    async findAll(companyId: number) {
        return await this.inputItemRepository.findAll(companyId);
    }
}
