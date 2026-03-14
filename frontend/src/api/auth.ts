import { authClient } from "./client";

export interface LoginResponse {
  access_token: string;
  user: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    full_name: string;
  };
}

export interface RegisterPayload {
  email: string;
  password: string;
  role: string;
  first_name?: string;
  last_name?: string;
}

export const authService = {
  login(email: string, password: string) {
    return authClient.post<LoginResponse>("/login", { email, password });
  },

  register(payload: RegisterPayload) {
    return authClient.post<{ message: string; user: LoginResponse["user"] }>(
      "/register",
      payload,
    );
  },

  getProfile() {
    return authClient.get<{
      user: {
        id: number;
        email: string;
        first_name: string;
        last_name: string;
        role: string;
        full_name: string;
      };
    }>("/me");
  },

  changePassword(currentPassword: string, newPassword: string) {
    return authClient.post("/change-password", {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },
};
