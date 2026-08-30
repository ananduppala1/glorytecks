import { authService } from '../services/auth.service';
import { adminUserRepo } from '../repositories';
import { supabaseAdmin } from '../config/supabase';
import { env } from '../config/env';
import { ROLES, Role } from '../constants';

interface SeedUser {
  name: string;
  email: string;
  password: string;
  role: Role;
}

/**
 * Upsert a single account: create the Supabase Auth identity and its profile,
 * or reset the password / reactivate an existing one.
 *
 * This is the ONLY bootstrap path into the system. There is no public signup
 * endpoint, and an Auth identity with no `admin_users` row cannot use the API,
 * so accounts only exist because an operator ran this script or an existing
 * admin created them through POST /admins.
 */
async function upsertUser({ name, email, password, role }: SeedUser): Promise<void> {
  const normalised = email.toLowerCase().trim();
  const existing = await adminUserRepo.findOne({ email: normalised });

  if (existing) {
    // Password lives in Supabase Auth, so reset it there…
    const { error } = await supabaseAdmin.auth.admin.updateUserById(existing.id, { password });
    if (error) throw new Error(`Could not reset password for ${normalised}: ${error.message}`);
    // …and refresh the application profile here.
    await adminUserRepo.updateById(existing.id, { name, role, isActive: true });
    console.log(`✓ Updated existing ${role}: ${normalised}`);
    return;
  }

  await authService.createAdminUser({ name, email: normalised, password, role });
  console.log(`✓ Created ${role}: ${normalised}`);
}

/**
 * Create (or update the password of) the bootstrap accounts.
 * Usage: `npm run seed:admin` — reads SEED_ADMIN_* / SEED_RECEPTIONIST_* /
 * SEED_CONTENT_WRITER_* from .env (all optional; sensible demo defaults are used).
 *
 * The admin account is always seeded (backward compatible). The receptionist and
 * content-writer demo accounts are seeded too, so all three roles can be tested
 * immediately. Override their credentials via env, or leave the defaults.
 */
async function run(): Promise<void> {
  const users: SeedUser[] = [
    {
      name: env.seedAdmin.name,
      email: env.seedAdmin.email,
      password: env.seedAdmin.password,
      role: ROLES.ADMIN,
    },
    {
      name: process.env.SEED_RECEPTIONIST_NAME ?? 'GloryTecks Reception',
      email: process.env.SEED_RECEPTIONIST_EMAIL ?? 'reception@glorytecks.com',
      password: process.env.SEED_RECEPTIONIST_PASSWORD ?? 'ChangeMe@12345',
      role: ROLES.RECEPTIONIST,
    },
    {
      name: process.env.SEED_CONTENT_WRITER_NAME ?? 'GloryTecks Content',
      email: process.env.SEED_CONTENT_WRITER_EMAIL ?? 'content@glorytecks.com',
      password: process.env.SEED_CONTENT_WRITER_PASSWORD ?? 'ChangeMe@12345',
      role: ROLES.CONTENT_WRITER,
    },
  ];

  for (const user of users) {
    await upsertUser(user);
  }

  console.log('  Passwords set from SEED_* env (or demo defaults). Log in and change them immediately.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Failed to seed accounts:', err);
  process.exit(1);
});
