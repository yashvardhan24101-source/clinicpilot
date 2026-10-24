export type UserRole = "owner" | "receptionist" | "doctor" | "super_admin";

export interface UserSession {
  id: string;
  user_id?: string;
  name: string;
  email: string;
  role: UserRole;
  clinic_id: string;
  clinic_name: string;
  avatar_url?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: UserSession;
  token?: string;
  expires_at: string;
}
