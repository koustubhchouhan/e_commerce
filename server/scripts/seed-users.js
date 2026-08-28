// Seeds three development accounts, one per role, so you can preview the
// customer, seller and admin dashboards without hand-editing the database.
//
// Run from the `server` directory:   npm run seed:users
//
// Safe to re-run: existing accounts get their password and role reset rather
// than erroring. DEV ONLY -- never run this against a production project, and
// never ship these credentials.

import { db } from '../src/config/supabase.js';

// Keep this password in sync with DEV_PASSWORD in src/pages/Login.jsx.
const PASSWORD = 'password123';

const ACCOUNTS = [
  { email: 'customer@novamarket.test', role: 'customer', fullName: 'Test Customer' },
  { email: 'seller@novamarket.test', role: 'seller', fullName: 'Test Seller' },
  { email: 'admin@novamarket.test', role: 'admin', fullName: 'Test Admin' },
];

// Fail early with an actionable message if the schema was never applied --
// otherwise we'd create auth users with no matching profile rows.
async function assertSchemaReady() {
  const { error } = await db.from('profiles').select('id').limit(1);
  if (!error) return;

  console.error('Cannot reach the `profiles` table.');
  console.error(`Supabase said: ${error.message}\n`);
  console.error('Most likely the schema was never applied. In the Supabase dashboard:');
  console.error('  1. open SQL Editor -> New query');
  console.error('  2. paste all of server/db/schema.sql and Run');
  console.error('  3. then db/create_order.sql, then db/seed.sql');
  console.error('\nIf the table does exist in Table Editor, the API schema cache is stale --');
  console.error("run  notify pgrst, 'reload schema';  in the SQL Editor and try again.");
  process.exit(1);
}

// Supabase has no "get user by email" admin call, so page through the list once
// and build a lookup table.
async function fetchExistingUsers() {
  const byEmail = new Map();
  let page = 1;

  for (;;) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`Could not list users: ${error.message}`);

    const users = data?.users ?? [];
    for (const user of users) {
      if (user.email) byEmail.set(user.email.toLowerCase(), user);
    }

    if (users.length < 200) break;
    page += 1;
  }

  return byEmail;
}

async function upsertAuthUser(account, existing) {
  if (existing) {
    const { data, error } = await db.auth.admin.updateUserById(existing.id, {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: account.fullName },
    });
    if (error) throw new Error(`Could not update ${account.email}: ${error.message}`);
    return { user: data.user, created: false };
  }

  const { data, error } = await db.auth.admin.createUser({
    email: account.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: account.fullName },
  });
  if (error) throw new Error(`Could not create ${account.email}: ${error.message}`);
  return { user: data.user, created: true };
}

// The handle_new_user trigger creates the profile row with role 'customer'.
// Force the role we actually want, and insert the row if the trigger missed it.
async function applyProfile(userId, account) {
  const { data: updated, error: updateErr } = await db
    .from('profiles')
    .update({ role: account.role, full_name: account.fullName })
    .eq('id', userId)
    .select('id');

  if (updateErr) throw new Error(`Could not set role for ${account.email}: ${updateErr.message}`);
  if (updated && updated.length > 0) return;

  const { error: insertErr } = await db
    .from('profiles')
    .insert({ id: userId, role: account.role, full_name: account.fullName });

  if (insertErr) throw new Error(`Could not create profile for ${account.email}: ${insertErr.message}`);
}

// Accounts created before the schema existed have no profile row, and the
// handle_new_user trigger only fires on INSERT -- so they'd fail login with
// "no profile row". Give every orphaned auth user a customer profile.
async function backfillMissingProfiles(existingUsers) {
  const { data: rows, error } = await db.from('profiles').select('id');
  if (error) throw new Error(`Could not read profiles: ${error.message}`);

  const haveProfiles = new Set((rows ?? []).map((row) => row.id));
  const orphans = [...existingUsers.values()].filter((user) => !haveProfiles.has(user.id));
  if (orphans.length === 0) return 0;

  const { error: insertErr } = await db.from('profiles').insert(
    orphans.map((user) => ({
      id: user.id,
      role: 'customer',
      full_name: user.user_metadata?.full_name ?? '',
    }))
  );
  if (insertErr) throw new Error(`Could not backfill profiles: ${insertErr.message}`);

  return orphans.length;
}

async function main() {
  console.log('Seeding development accounts...\n');

  await assertSchemaReady();

  const existingUsers = await fetchExistingUsers();
  const results = [];

  for (const account of ACCOUNTS) {
    const existing = existingUsers.get(account.email.toLowerCase());
    const { user, created } = await upsertAuthUser(account, existing);
    await applyProfile(user.id, account);
    existingUsers.set(account.email.toLowerCase(), user);
    results.push({ ...account, created });
    console.log(`  ${created ? 'created' : 'updated'}  ${account.email}  (role: ${account.role})`);
  }

  const backfilled = await backfillMissingProfiles(existingUsers);
  if (backfilled > 0) {
    console.log(`\n  backfilled ${backfilled} pre-existing account(s) with a customer profile`);
  }

  console.log('\nDone. Sign in with any of these:\n');
  for (const account of results) {
    console.log(`  ${account.role.padEnd(9)} ${account.email}   password: ${PASSWORD}`);
  }
  console.log('\nOr use the "Dev quick login" buttons on the login page (dev builds only).');
}

main().catch((err) => {
  console.error(`\nSeed failed: ${err.message}`);
  process.exit(1);
});
