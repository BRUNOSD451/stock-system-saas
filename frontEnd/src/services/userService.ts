import type { User } from "../resources/types/types";

// Criar usuário ou redefinir senha devolve a senha provisória, mostrada uma única vez.
export interface TemporaryAccess {
  user: User;
  temporaryPassword: string;
}
import { apiController } from "./Api";

class UserApiService {
  create(data: Omit<User, "userId">, image?: File | null): Promise<TemporaryAccess> {
    const body = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value != null) body.append(key, String(value));
    });
    if (image) body.append("image", image);
    return apiController.postForm<TemporaryAccess>("/users/create", body);
  }

  updateImage(image: File): Promise<User> {
    const body = new FormData();
    body.append("image", image);
    return apiController.patch<User>("/users/me/image", body);
  }

  resetPassword(id: number): Promise<TemporaryAccess> {
    return apiController.post<TemporaryAccess>(`/users/${id}/reset-password`, {});
  }

  // A própria pessoa troca a senha; a resposta traz um token novo.
  changeOwnPassword(currentPassword: string, newPassword: string): Promise<{ token: string; user: User }> {
    return apiController.post<{ token: string; user: User }>("/users/me/password", { currentPassword, newPassword });
  }

  getAll(): Promise<User[]> {
    return apiController.get<User[]>("/users");
  }

  async delete(id: number): Promise<void> {
    await apiController.delete<void>(`/users/delete/${id}`);
  }

  async update(data: Partial<User>, id: number): Promise<void> {
    await apiController.patch(`/users/update/${id}`, data);
  }
}

export const UserService = new UserApiService();
