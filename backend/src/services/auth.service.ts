import { supabaseAdmin, supabaseAuth } from '../config/supabase';
import { adminUserRepo } from '../repositories';
import { IAdminUser } from '../interfaces/common';
import { ApiError } from '../utils/ApiError';
import { logger } from '../config/logger';
import { Role, ROLES } from '../constants';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  lastLoginAt?: Date | string;
}

/** Passwords are stored by Supabase Auth; this mirrors the old schema minimum. */
const MIN_PASSWORD_LENGTH = 8;

function toPublicUser(user: IAdminUser): PublicUser {
  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    lastLoginAt: user.lastLoginAt,
  };
}

/**
 * Authentication service — Supabase Auth behind the existing API contract.
 *
 * WHAT CHANGED
 *   Tokens are now issued and verified by Supabase Auth instead of being
 *   signed by this process. `accessToken` in the login/refresh response is a
 *   Supabase access token and the refresh cookie holds a Supabase refresh
 *   token.
 *
 * WHAT DID NOT CHANGE
 *   Route paths, request bodies, response envelopes, status codes, error
 *   messages, and the httpOnly refresh cookie. The admin frontend still posts
 *   { email, password } to /auth/login, reads `data.accessToken`, and sends
 *   `Authorization: Bearer <token>` — so it needs no changes at all.
 *
 * AUTHORIZATION IS NOT DELEGATED
 *   Supabase Auth answers "who is this?". It never answers "may they do this?".
 *   Every method below re-reads the `admin_users` profile, and a Supabase
 *   identity with no profile row — or an inactive one — is rejected. That is
 *   what makes self-signup useless even if it were somehow enabled on the
 *   project: an account with no profile has no access to anything.
 */
export const authService = {
  /** Look up the application profile for a Supabase identity. */
  async getProfileById(userId: string): Promise<IAdminUser | null> {
    return adminUserRepo.findById(userId);
  },

  async login(email: string, password: string): Promise<{ user: PublicUser; tokens: AuthTokens }> {
    const normalisedEmail = email.toLowerCase().trim();

    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email: normalisedEmail,
      password,
    });

    // Supabase distinguishes "wrong password" from "no such user"; the previous
    // implementation deliberately did not, and neither do we.
    if (error || !data.session || !data.user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const profile = await adminUserRepo.findById(data.user.id);
    if (!profile) {
      // A Supabase identity with no admin profile is not a user of this app.
      await supabaseAuth.auth.signOut();
      throw ApiError.unauthorized('Invalid email or password');
    }
    if (!profile.isActive) {
      throw ApiError.forbidden('Account is disabled');
    }

    const updated = await adminUserRepo.updateRawById(profile.id, {
      last_login_at: new Date().toISOString(),
    });

    return {
      user: toPublicUser(updated ?? profile),
      tokens: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      },
    };
  },

  /**
   * Exchange a refresh token for a new session.
   * Supabase rotates the refresh token on every use and invalidates the old
   * one, which is the same reuse protection the previous hashed-token scheme
   * provided — without this service storing anything.
   */
  async refresh(refreshToken: string): Promise<{ user: PublicUser; tokens: AuthTokens }> {
    if (!refreshToken) throw ApiError.unauthorized('No refresh token provided');

    const { data, error } = await supabaseAuth.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session || !data.user) {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    const profile = await adminUserRepo.findById(data.user.id);
    if (!profile || !profile.isActive) {
      throw ApiError.unauthorized('Session expired, please log in again');
    }

    return {
      user: toPublicUser(profile),
      tokens: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      },
    };
  },

  /**
   * Revoke the caller's sessions. The old implementation cleared the stored
   * refresh-token hash; the equivalent here is asking Supabase to sign the
   * user out. Failures are logged and swallowed: the client clears its cookie
   * regardless, and logout must never return an error to the user.
   */
  async logout(accessToken?: string): Promise<void> {
    if (!accessToken) return;
    try {
      await supabaseAdmin.auth.admin.signOut(accessToken, 'global');
    } catch (err) {
      logger.warn(`Logout: could not revoke Supabase session — ${(err as Error).message}`);
    }
  },

  async getProfile(userId: string): Promise<PublicUser> {
    const user = await adminUserRepo.findById(userId);
    if (!user) throw ApiError.notFound('User not found');
    return toPublicUser(user);
  },

  async updateProfile(
    userId: string,
    data: { name?: string; avatar?: string },
  ): Promise<PublicUser> {
    const existing = await adminUserRepo.findById(userId);
    if (!existing) throw ApiError.notFound('User not found');

    const payload: Record<string, unknown> = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.avatar !== undefined) payload.avatar = data.avatar;

    const updated = await adminUserRepo.updateById(userId, payload);
    return toPublicUser(updated ?? existing);
  },

  /**
   * Change the caller's password.
   * The current password is verified by attempting a real sign-in, which is
   * the Supabase equivalent of the old bcrypt compare — this service never
   * sees or stores a password hash.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    accessToken?: string,
  ): Promise<void> {
    const user = await adminUserRepo.findById(userId);
    if (!user) throw ApiError.notFound('User not found');

    const { error: signInError } = await supabaseAuth.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (signInError) throw ApiError.badRequest('Current password is incorrect');

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (error) throw ApiError.badRequest(error.message);

    // Previously the stored refresh hash was cleared to force re-login
    // everywhere; the equivalent is revoking all outstanding sessions.
    await this.logout(accessToken);
  },

  /* ── Administrator provisioning ─────────────────────────────────────────── */

  /**
   * Create an administrator: a Supabase Auth identity plus its application
   * profile. Only reachable from the admin-only POST /admins route — there is
   * no public signup endpoint anywhere in this API.
   *
   * The two writes span two systems and cannot share a transaction, so a failed
   * profile insert deletes the just-created identity. Without that compensation
   * a half-created account would occupy the email address while being unable to
   * sign in to anything.
   */
  async createAdminUser(input: {
    name: string;
    email: string;
    password: string;
    role?: Role;
  }): Promise<IAdminUser> {
    const email = String(input.email ?? '').toLowerCase().trim();
    const name = String(input.name ?? '').trim();
    const role = (input.role ?? ROLES.ADMIN) as Role;

    if (!name) {
      throw ApiError.unprocessable('Validation failed', [
        { field: 'name', message: 'Name is required' },
      ]);
    }
    if (!email) {
      throw ApiError.unprocessable('Validation failed', [
        { field: 'email', message: 'A valid email is required' },
      ]);
    }
    // Mirrors the former `minlength: 8` on the Mongoose password path.
    if (!input.password || input.password.length < MIN_PASSWORD_LENGTH) {
      throw ApiError.unprocessable('Validation failed', [
        {
          field: 'password',
          message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
        },
      ]);
    }

    const existing = await adminUserRepo.exists({ email });
    if (existing) throw ApiError.conflict('An admin with this email already exists');

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: input.password,
      // Admins are provisioned by another admin, so there is nobody to click a
      // confirmation link; mark the address confirmed at creation time.
      email_confirm: true,
      user_metadata: { name },
    });

    if (error || !data.user) {
      if (error?.message?.toLowerCase().includes('already')) {
        throw ApiError.conflict('An admin with this email already exists');
      }
      throw ApiError.badRequest(error?.message ?? 'Could not create the administrator account');
    }

    try {
      return await adminUserRepo.insertRaw({
        id: data.user.id,
        name,
        email,
        role,
      });
    } catch (err) {
      // Compensating action — never leave an orphaned identity behind.
      await supabaseAdmin.auth.admin.deleteUser(data.user.id).catch(() => undefined);
      throw err;
    }
  },

  /**
   * Delete an administrator. Removing the Supabase identity cascades to the
   * profile row (admin_users.id references auth.users ON DELETE CASCADE), so
   * the identity is deleted first and the profile follows automatically.
   */
  async deleteAdminUser(userId: string): Promise<boolean> {
    const profile = await adminUserRepo.findById(userId);
    if (!profile) return false;

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) {
      // The identity may already be gone; make sure the profile is too.
      await adminUserRepo.deleteById(userId);
      logger.warn(`Deleted admin profile ${userId} but Auth reported: ${error.message}`);
      return true;
    }
    // Defensive: if the cascade did not fire, remove the profile explicitly.
    await adminUserRepo.deleteById(userId).catch(() => undefined);
    return true;
  },
};
