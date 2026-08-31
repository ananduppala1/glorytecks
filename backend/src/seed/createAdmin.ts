import { authService } from '../services/auth.service';
import { adminUserRepo } from '../repositories';
import { supabaseAdmin } from '../config/supabase';
import { env, isWeakSecret } from '../config/env';
import { ROLES, Role } from '../constants';

/** Newline for multi-line console output. */
const EOL = String.fromCharCode(10);

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
 *
 * Usage: `npm run seed:admin`, with SEED_ADMIN_PASSWORD /
 * SEED_RECEPTIONIST_PASSWORD / SEED_CONTENT_WRITER_PASSWORD set.
 *
 * PASSWORDS NO LONGER HAVE DEFAULTS. They used to fall back to a value printed
 * in this repository, which meant running this script against a production
 * project created three administrators with a published password — and
 * re-running it silently RESET an existing admin's password back to that
 * value. Both are now refusals rather than defaults.
 *
 * Against a production database the script additionally requires an explicit
 * `--production` acknowledgement, because the destructive half of its
 * behaviour (resetting the password of an existing account) is not obvious
 * from its name.
 */
/** Accounts to seed, each gated on its own password being supplied. */
interface SeedCandidate extends Omit<SeedUser, 'password'> {
  password: string | undefined;
  envVar: string;
}

async function run(): Promise<void> {
  const candidates: SeedCandidate[] = [
    {
      name: env.seedAdmin.name,
      email: env.seedAdmin.email,
      password: env.seedAdmin.password || undefined,
      envVar: 'SEED_ADMIN_PASSWORD',
      role: ROLES.ADMIN,
    },
    {
      name: process.env.SEED_RECEPTIONIST_NAME ?? 'GloryTecks Reception',
      email: process.env.SEED_RECEPTIONIST_EMAIL ?? 'reception@glorytecks.com',
      password: process.env.SEED_RECEPTIONIST_PASSWORD,
      envVar: 'SEED_RECEPTIONIST_PASSWORD',
      role: ROLES.RECEPTIONIST,
    },
    {
      name: process.env.SEED_CONTENT_WRITER_NAME ?? 'GloryTecks Content',
      email: process.env.SEED_CONTENT_WRITER_EMAIL ?? 'content@glorytecks.com',
      password: process.env.SEED_CONTENT_WRITER_PASSWORD,
      envVar: 'SEED_CONTENT_WRITER_PASSWORD',
      role: ROLES.CONTENT_WRITER,
    },
  ];

  // Creating or resetting an administrator against production is not something
  // to do by running a script whose name sounds routine.
  if (env.isProd && !process.argv.includes('--production')) {
    console.error(
      [
        'Refusing to seed accounts with NODE_ENV=production.',
        'This creates administrators and RESETS the password of any that already exists.',
        'Re-run with --production if that is genuinely what you want.',
      ].join(EOL),
    );
    process.exit(1);
  }

  const weak = candidates.filter((c) => isWeakSecret(c.password));
  if (weak.length) {
    const lines = ['Refusing to seed accounts with missing or weak passwords.', ''];
    for (const c of weak) {
      const why = c.password ? 'too weak, or a known default' : 'not set';
      lines.push(`  ${c.envVar} is ${why} (needed for the ${c.role} account)`);
    }
    lines.push(
      '',
      'Set each to a unique value of at least 12 characters, for example:',
      '  SEED_ADMIN_PASSWORD="$(openssl rand -base64 24)" npm run seed:admin',
      '',
      'These are bootstrap credentials: sign in and change them immediately,',
      'and do not commit them to the repository.',
    );
    console.error(lines.join(EOL));
    process.exit(1);
  }

  for (const c of candidates) {
    await upsertUser({ name: c.name, email: c.email, password: c.password!, role: c.role });
  }

  console.log('  Passwords were taken from the SEED_* environment variables.');
  console.log('  Sign in and change them now, and clear them from your shell history.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Failed to seed accounts:', err);
  process.exit(1);
});
