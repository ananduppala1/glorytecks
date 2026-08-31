import "express";
import { Role } from '../constants';
import { VerifiedUpload } from '../middlewares/upload';

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
      /**
       * The uploaded file AFTER content inspection. Set by the upload
       * middleware chain; controllers must read this rather than `req.file`,
       * whose `mimetype` and `originalname` are client-supplied.
       */
      upload?: VerifiedUpload;
      /**
       * Correlation id for this request. Echoed on 5xx responses and attached
       * to every log line, so a generic client message can still be traced to
       * the exact failure server-side.
       */
      requestId?: string;
    }
  }
}

export {};
