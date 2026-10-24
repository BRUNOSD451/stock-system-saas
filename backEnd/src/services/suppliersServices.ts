import { SuppliersRepository } from "../repository/suppliersRepository";

export class SuppliersService{

private suplierRepository = new SuppliersRepository()

async findAll(companyId: number){
    return await this.suplierRepository.findAll(companyId)
}

async create(companyId: number, newSupplier:any){

return await this.suplierRepository.create(companyId, newSupplier)

}

async delete(companyId: number, id:number){

    return await this.suplierRepository.delete(companyId, id)

}

async update(companyId: number, updateData:any, id:number){

    return await this.suplierRepository.update(companyId, updateData, id)

}

}
