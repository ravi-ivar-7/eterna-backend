export interface JWTPayload {
  userId: number;
  username: string;
}

export interface AuthResponse {
  success: boolean;
  userId: number;
  username: string;
  token: string;
}

export interface AuthRequest {
  username: string;
  password: string;
}
