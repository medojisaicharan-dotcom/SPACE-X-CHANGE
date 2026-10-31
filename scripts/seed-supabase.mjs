/*
 * Seed the live Supabase project with demo accounts, every partner institution and
 * their bookable resources.
 *
 * Usage (PowerShell):
 *   $env:SUPABASE_URL="https://<project>.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY="<service-role-or-secret-key>"
 *   npm run seed:supabase
 *
 * Prefer database/seed/0003_seed_live_data.sql when you only have the dashboard: it
 * seeds the same catalogue without needing the service-role key.
 *
 * The service-role key must never be exposed to the browser. This script runs locally only.
 */

import { createClient } from '@supabase/supabase-js';
import {
  ACCOUNTS,
  DEFAULTS,
  INSTITUTIONS,
  INSTITUTION_BY_SLUG,
  RESOURCES,
  seedUuid,
} from './lib/seedCatalog.mjs';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

if (!url || !key) {
  console.error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add them to your shell environment (or .env.local) and run again.',
  );
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const today = new Date();
const availableFrom = today.toISOString().slice(0, 10);
const availableTo = new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

function fail(context, error) {
  console.error(`\n[${context}] ${error.message ?? error}`);
  process.exitCode = 1;
}

async function seedInstitutions() {
  const rows = INSTITUTIONS.map((institution) => ({
    id: seedUuid('institution', institution.slug),
    name: institution.name,
    type: institution.type,
    location: institution.location,
    contact_email: institution.contactEmail,
    verified: institution.verified,
  }));

  const { error } = await admin.from('institutions').upsert(rows, { onConflict: 'id' });
  if (error) {
    fail('institutions:upsert', error);
    return false;
  }
  console.log(`  + ${rows.length} institutions`);
  return true;
}

async function seedAccounts() {
  const { data: userList, error: userListError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (userListError) {
    fail('auth:listUsers', userListError);
    return null;
  }

  const ids = new Map();

  for (const account of ACCOUNTS) {
    const institution = INSTITUTION_BY_SLUG.get(account.institution);
    const metadata = {
      full_name: account.fullName,
      role: account.role,
      institution_id: seedUuid('institution', institution.slug),
      institution_name: institution.name,
    };

    let user = (userList?.users ?? []).find(
      (candidate) => candidate.email?.toLowerCase() === account.email.toLowerCase(),
    );

    if (!user) {
      const { data, error } = await admin.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: metadata,
      });
      if (error) {
        fail(`auth:createUser:${account.email}`, error);
        continue;
      }
      user = data.user;
      console.log(`  + auth user ${account.email}`);
    } else {
      const { error } = await admin.auth.admin.updateUserById(user.id, {
        password: account.password,
        email_confirm: true,
        user_metadata: metadata,
      });
      if (error) fail(`auth:updateUser:${account.email}`, error);
      else console.log(`  = auth user ${account.email}`);
    }

    if (!user) continue;
    ids.set(account.slug, user.id);

    const { error: profileError } = await admin.from('profiles').upsert(
      {
        id: user.id,
        email: account.email,
        full_name: account.fullName,
        role: account.role,
        institution_id: seedUuid('institution', institution.slug),
        institution_name: institution.name,
        verified: true,
        suspended: false,
      },
      { onConflict: 'id' },
    );
    if (profileError) fail(`profiles:upsert:${account.email}`, profileError);
    else console.log(`  + profile ${account.email} (${account.role})`);
  }

  return ids;
}

async function seedResources(ownerId) {
  if (!ownerId) {
    console.error('Owner account missing; skipping resources.');
    return;
  }

  const rows = RESOURCES.map((resource) => {
    const institution = INSTITUTION_BY_SLUG.get(resource.institution);
    return {
      id: seedUuid('resource', resource.slug),
      owner_id: ownerId,
      institution_id: seedUuid('institution', institution.slug),
      institution_name: institution.name,
      name: resource.name,
      category: resource.category,
      description: resource.description,
      location: resource.location,
      available_from: availableFrom,
      available_to: availableTo,
      available_days: resource.availableDays ?? DEFAULTS.availableDays,
      open_time: resource.openTime ?? DEFAULTS.openTime,
      close_time: resource.closeTime ?? DEFAULTS.closeTime,
      hourly_rate: resource.hourlyRate ?? 0,
      daily_rate: resource.dailyRate ?? 0,
      security_deposit: resource.securityDeposit ?? 0,
      required_qualifications: resource.requiredQualifications ?? [],
      required_training: resource.requiredTraining ?? [],
      supervision_required: Boolean(resource.supervisionRequired),
      usage_instructions: resource.usageInstructions ?? DEFAULTS.usageInstructions,
      booking_conditions: resource.bookingConditions ?? DEFAULTS.bookingConditions,
      max_booking_hours: resource.maxBookingHours ?? DEFAULTS.maxBookingHours,
      cancellation_policy: resource.cancellationPolicy ?? DEFAULTS.cancellationPolicy,
      active: true,
    };
  });

  const { error } = await admin.from('resources').upsert(rows, { onConflict: 'id' });
  if (error) fail('resources:upsert', error);
  else console.log(`  + ${rows.length} resources`);
}

async function seedSettings() {
  const { error } = await admin.from('platform_settings').upsert(
    {
      id: 1,
      max_active_bookings: 3,
      max_bookings_per_month: 10,
      max_booking_hours: 4,
      institution_priority_enabled: true,
      waiting_list_enabled: true,
      auto_approval: false,
      overdue_grace_minutes: 30,
    },
    { onConflict: 'id' },
  );
  if (error) fail('platform_settings:upsert', error);
}

async function main() {
  console.log(`Seeding ${url}`);

  if (!(await seedInstitutions())) return;

  const ids = await seedAccounts();
  if (!ids) return;

  await seedResources(ids.get('owner'));
  await seedSettings();

  console.log('\nDone. Demo sign-ins:');
  ACCOUNTS.forEach((account) => {
    console.log(`  ${account.email} / ${account.password} (${account.role})`);
  });
  console.log('\nReminder: apply database/migrations/0002_app_integration.sql if you have not already.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
