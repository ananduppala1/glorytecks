import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../config/supabase';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { adminUserRepo } from '../repositories';
import { Role } from '../constants';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Verify a Supabase access token and return the subject (the auth.users id).
 *
 * Two verification paths, in order of preference:
 *
 *  1. LOCAL (fast) — when SUPABASE_JWT_SECRET is set, the HS256 signature is
 *     checked in-process. No network hop per request.
 *  2. REMOTE (authoritative) — otherwise the token is handed to the Supabase
 *     Auth server. This is the path for projects using asymmetric signing keys,
 *     where the backend has no shared secret to verify with.
 *
 * Only `sub` is taken from the token. Claims such as `role` or `email` are
 * supplied by the token holder's identity provider and are NOT used for
 * authorization — see the profile lookup in requireAuth.
 */
async function verifyAccessToken(token: string): Promise<string | null> {
  if (env.supabase.jwtSecret) {
    try {
      const payload = jwt.verify(token, env.supabase.jwtSecret, {
        algorithms: ['HS256'],
        audience: 'authenticated',
      }) as jwt.JwtPayload;
      return typeof payload.sub === 'string' ? payload.sub : null;
    } catch {
      return null;
    }
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

/**
 * Require a valid access token (Authorization: Bearer <token>).
 *
 * Attaches `req.user` and verifies the underlying account is still active —
 * same guarantee as before, with the identity check moved to Supabase Auth and
 * the authorization data still read from our own table on every request.
 *
 * SECURITY: the role always comes from `admin_users`, never from the token.
 * A user cannot become an admin by editing a claim, minting a token from
 * another Supabase project, or sending a role in the request body. Equally, a
 * valid Supabase identity that has no `admin_users` row gets 401 — which is
 * what keeps admin access closed even if signup were enabled on the project.
 */
export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : undefined;
  if (!token) throw ApiError.unauthorized('Authentication required');

  const userId = await verifyAccessToken(token);
  if (!userId) throw ApiError.unauthorized('Invalid or expired token');

  const user = await adminUserRepo.findById(userId, {
    fields: ['id', 'name', 'email', 'role', 'isActive'],
  });
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('Account is inactive or no longer exists');
  }

  req.user = {
    id: String(user.id),
    email: user.email,
    role: user.role,
    name: user.name,
  };
  // Kept so logout / change-password can revoke this exact session upstream.
  req.accessToken = token;
  next();
});

/**
 * Role-based authorization guard. Use after requireAuth.
 * e.g. router.delete('/:id', requireAuth, authorize('admin'), handler)
 */
export const authorize =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (roles.length && !roles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    return next();
  };
