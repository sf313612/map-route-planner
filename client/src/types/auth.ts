export type AuthSession = {
  token: string;
  userId: string | null;
  isGuest?: boolean;
  username?: string;
  email?: string;
};
