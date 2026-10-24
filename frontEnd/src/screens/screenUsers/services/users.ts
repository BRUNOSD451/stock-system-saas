import { UserService, type TemporaryAccess } from "../../../services/userService";
import type { User } from "../../../resources/types/types";
import { apiController } from "../../../services/Api";

// A senha não é enviada: o backend gera uma provisória.
export type CreateUserData = Omit<User, "userId" | "password">;

export type UpdateUserData = Partial<Omit<User, "userId">>;

export function getUsers(): Promise<User[]> {
  return apiController.get<User[]>("/users");
}

export function createUser(data: CreateUserData, image?: File | null): Promise<TemporaryAccess> {
  return UserService.create(data, image);
}

export function resetUserPassword(id: number): Promise<TemporaryAccess> {
  return UserService.resetPassword(id);
}

export function updateUser(id: number, data: UpdateUserData): Promise<User> {
  return apiController.patch<User>(`/users/update/${id}`, data);
}

export async function deleteUser(id: number): Promise<void> {
  await apiController.delete<void>(`/users/delete/${id}`);
}
