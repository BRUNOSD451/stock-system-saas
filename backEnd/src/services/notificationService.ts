import { notificationRepository } from "../repository/notificationRepository"
import { UserRepository } from "../repository/userRepository";

export class NotificationService{

private  userRepository = new UserRepository()


async findByUserId(companyId: number, userId: number) {
    return await notificationRepository.findByUserId(companyId, userId);
}

async markAsReadByUserId(companyId: number, userId: number) {
    return await notificationRepository.markAsReadByUserId(companyId, userId);
}



async notificationOutput(companyId: number, userId:number){

    const user = await this.userRepository.findById(companyId, userId)

const newNotification = {
    name:"stockOutput",
    notificationText : `saida de produto do estoque realizada por ${user.userName}`
}
 await notificationRepository.createNotification(companyId, newNotification)


}


async notificationFewProduct(companyId: number, currentStock:number,name:string){
const newNotification = {
    name:"fewProduct",
    notificationText : `estoque de ${name} esta com apenas ${currentStock} unidades  `
}
 await notificationRepository.createNotification(companyId, newNotification)

}



async notificationInput(companyId: number, userId:number){
const user = await this.userRepository.findById(companyId, userId)

const newNotification = {
    name:"stockInput",
    notificationText : `entrada de produto no estoque realizada por ${user.userName}`
}
 await notificationRepository.createNotification(companyId, newNotification)
}






}




export const notificationService = new NotificationService()
