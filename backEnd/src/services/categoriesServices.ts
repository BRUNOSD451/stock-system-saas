import { CategoryRepository } from "../repository/categoriesRepository";

export class CategoriesService{
private categoryRepository = new CategoryRepository()
async findAll(companyId: number){

    return await this.categoryRepository.findAll(companyId)
}

async delete(companyId: number, id:number){

return await this.categoryRepository.delete(companyId, id)

}

async create(companyId: number, data:any){
    return await this.categoryRepository.create(companyId, data)
}

async update(companyId: number, updateData:any, id:number){

    return await this.categoryRepository.update(companyId, updateData, id)

}

}
