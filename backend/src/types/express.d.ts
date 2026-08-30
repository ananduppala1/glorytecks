import "express";
import { Role } from '../constants';

declare global {
   
  namespace Express {
    interface AuthUser {
      id: string;
      email: string;
      role: Role;
      name: string;
    }
    interface Request {
      user?: AuthUser;
      /**
       * The raw Supabase access token for this request. Set by requireAuth so
       * logout and change-password can revoke the caller's sessions upstream.
       */
      accessToken?: string;
    }
  }
}

export {};
