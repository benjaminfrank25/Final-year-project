import type { Level, Role, Status } from "../models/User";

declare global {
  namespace Express {
    interface AuthUser {
      id: string;
      fullName: string;
      email: string;
      role: Role;
      level?: Level;
      status: Status;
    }

    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
