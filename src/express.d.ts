declare global {
  namespace Express {
    interface Request {
      userId?: string;
      isGuest?: boolean;
    }
  }
}

export {};
