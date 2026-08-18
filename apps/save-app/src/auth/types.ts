export type AuthUser = {
  id: number;
  email: string;
  name: string;
  department: string | null;
  universityId: number | null;
  universityName: string | null;
  profileImageUrl: string | null;
  role: 'USER' | 'ADMIN';
};

export type MobileSession = {
  accessToken: string;
  tokenType: 'Bearer';
  isNewUser: boolean;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: AuthUser;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type SignupInput = {
  email: string;
  password: string;
  name: string;
  department?: string | null;
  universityId?: number | null;
};
