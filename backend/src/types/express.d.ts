declare namespace Express {
  interface Request {
    user?: {
      userId: string;
      role: "ADMIN" | "STUDENT";
      sessionId: string;
    };
  }
}
