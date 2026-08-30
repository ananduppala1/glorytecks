import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';
import { env } from '../config/env';
import { COOKIE_NAMES } from '../constants';
import { ApiError } from '../utils/ApiError';

// 7 days in ms (aligns with default refresh expiry; cookie maxAge is best-effort).
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAMES.REFRESH, token, {
    httpOnly: true,
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
    maxAge: REFRESH_COOKIE_MAX_AGE,
    path: '/',
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(COOKIE_NAMES.REFRESH, {
    httpOnly: true,
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
    path: '/',
  });
}

export const authController = {
  login: asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body as { email: string; password: string };
    const { user, tokens } = await authService.login(email, password);
    setRefreshCookie(res, tokens.refreshToken);
    return sendSuccess(res, { user, accessToken: tokens.accessToken }, 'Logged in successfully');
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    // Accept refresh token from cookie (preferred) or body (fallback for mobile clients).
    const token: string | undefined =
      req.cookies?.[COOKIE_NAMES.REFRESH] ?? (req.body as { refreshToken?: string }).refreshToken;
    if (!token) throw ApiError.unauthorized('No refresh token');
    const { user, tokens } = await authService.refresh(token);
    setRefreshCookie(res, tokens.refreshToken);
    return sendSuccess(res, { user, accessToken: tokens.accessToken }, 'Token refreshed');
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    // Revokes the Supabase session behind this access token; previously this
    // cleared the stored refresh-token hash. Same effect, same response.
    if (req.user) await authService.logout(req.accessToken);
    clearRefreshCookie(res);
    return sendSuccess(res, null, 'Logged out');
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.getProfile(req.user!.id);
    return sendSuccess(res, user, 'Profile fetched');
  }),

  updateProfile: asyncHandler(async (req: Request, res: Response) => {
    const { name, avatar } = req.body as { name?: string; avatar?: string };
    const user = await authService.updateProfile(req.user!.id, { name, avatar });
    return sendSuccess(res, user, 'Profile updated');
  }),

  changePassword: asyncHandler(async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
    };
    await authService.changePassword(
      req.user!.id,
      currentPassword,
      newPassword,
      req.accessToken,
    );
    clearRefreshCookie(res);
    return sendSuccess(res, null, 'Password changed, please log in again');
  }),
};

