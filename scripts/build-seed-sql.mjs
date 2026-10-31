/**
 * Regenerates database/seed/0003_seed_live_data.sql from database/seed/catalog.json.
 *
 *   npm run seed:sql
 *
 * The generated file is a single paste-and-run query for the Supabase SQL editor.
 * It is idempotent: rows use deterministic UUIDs, so re-running updates instead of
 * duplicating.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import {
  ACCOUNTS,
  DEFAULTS,
  INSTITUTIONS,
  INSTITUTION_BY_SLUG,
  RESOURCES,
  seedUuid,
} from './lib/seedCatalog.mjs';

const outDir = path.resolve('database/seed');
const outFile = path.join(outDir, '0003_seed_live_data.sql');

const q = (value) => `'${String(value).replace(/'/g, "''")}'`;
const textArray = (values) => `array[${(values ?? []).map(q).join(', ')}]::text[]`;

const now = new Date();
const availableFrom = now.toISOString().slice(0, 10);
const availableTo = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const lines = [];
const push = (...rows) => lines.push(...rows);

push(
  '-- ===========================================================================',
  '-- SPACEXCHANGE live seed - paste this whole file into the Supabase SQL editor',
  '-- ===========================================================================',
  '--',
  '-- Creates (or refreshes) the demo sign-in accounts, every partner institution and',
  '-- their bookable resources, plus platform settings.',
  '--',
  `--   institutions : ${INSTITUTIONS.length}`,
  `--   resources    : ${RESOURCES.length}`,
  `--   accounts     : ${ACCOUNTS.length}`,
  '--',
  '-- Safe to re-run: every row uses a deterministic id, so existing data is updated',
  '-- in place instead of duplicated.',
  '--',
  '-- Demo sign-ins (already email-confirmed):',
  ...ACCOUNTS.map((a) => `--   ${a.email}  /  ${a.password}   (${a.role})`),
  '--',
  '-- Apply database/migrations/0002_app_integration.sql first so newly registered',
  '-- accounts also receive a profile automatically.',
  '-- ===========================================================================',
  '',
  'begin;',
  '',
  'create extension if not exists pgcrypto with schema extensions;',
  'set local search_path = public, extensions;',
  '',
  "-- Keep the guard triggers from rejecting the trusted, out-of-band seed writes.",
  'alter table public.profiles disable trigger profiles_guard_privileges;',
  'alter table public.institutions disable trigger institutions_guard_changes;',
  '',
  '-- ---------------------------------------------------------------------------',
  '-- 1. Demo auth accounts (pre-confirmed so they can sign in immediately)',
  '-- ---------------------------------------------------------------------------',
  '',
  'insert into auth.users (',
  '  instance_id, id, aud, role, email, encrypted_password,',
  '  email_confirmed_at, created_at, updated_at,',
  '  raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous',
  ')',
  'values',
);

const accountRows = ACCOUNTS.map((account) => {
  const id = seedUuid('account', account.slug);
  const institution = INSTITUTION_BY_SLUG.get(account.institution);
  const meta = JSON.stringify({
    full_name: account.fullName,
    role: account.role,
    institution_name: institution.name,
  }).replace(/'/g, "''");
  return `  ('00000000-0000-0000-0000-000000000000', '${id}', 'authenticated', 'authenticated', ${q(account.email)}, extensions.crypt(${q(account.password)}, extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '${meta}'::jsonb, false, false)`;
});
push(accountRows.join(',\n') + '\non conflict (id) do update set\n' +
  '  encrypted_password = excluded.encrypted_password,\n' +
  '  email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()),\n' +
  '  raw_user_meta_data = excluded.raw_user_meta_data,\n' +
  '  updated_at = now();',
  '',
  'insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)',
  'values',
  ACCOUNTS.map((account) => {
    const id = seedUuid('account', account.slug);
    return `  (gen_random_uuid(), '${id}', '${id}', jsonb_build_object('sub', '${id}', 'email', ${q(account.email)}, 'email_verified', true), 'email', now(), now(), now())`;
  }).join(',\n') + '\non conflict (provider_id, provider) do nothing;',
  '',
  '-- ---------------------------------------------------------------------------',
  '-- 2. Institutions',
  '-- ---------------------------------------------------------------------------',
  '',
  'insert into public.institutions (id, name, type, location, contact_email, verified)',
  'values',
  INSTITUTIONS.map((institution) =>
    `  ('${seedUuid('institution', institution.slug)}', ${q(institution.name)}, ${q(institution.type)}, ${q(institution.location)}, ${q(institution.contactEmail)}, ${institution.verified ? 'true' : 'false'})`,
  ).join(',\n') + '\non conflict (id) do update set\n' +
  '  name = excluded.name,\n' +
  '  type = excluded.type,\n' +
  '  location = excluded.location,\n' +
  '  contact_email = excluded.contact_email,\n' +
  '  verified = excluded.verified;',
  '',
  '-- ---------------------------------------------------------------------------',
  '-- 3. Profiles for the demo accounts',
  '-- ---------------------------------------------------------------------------',
  '',
  'insert into public.profiles (id, email, full_name, role, institution_id, institution_name, verified, suspended)',
  'values',
  ACCOUNTS.map((account) => {
    const id = seedUuid('account', account.slug);
    const institution = INSTITUTION_BY_SLUG.get(account.institution);
    return `  ('${id}', ${q(account.email)}, ${q(account.fullName)}, ${q(account.role)}::public.app_role, '${seedUuid('institution', account.institution)}', ${q(institution.name)}, true, false)`;
  }).join(',\n') + '\non conflict (id) do update set\n' +
  '  full_name = excluded.full_name,\n' +
  '  role = excluded.role,\n' +
  '  institution_id = excluded.institution_id,\n' +
  '  institution_name = excluded.institution_name,\n' +
  '  verified = true,\n' +
  '  suspended = false,\n' +
  '  updated_at = now();',
  '',
  '-- ---------------------------------------------------------------------------',
  '-- 4. Resource listings (owned by the demo resource owner)',
  '-- ---------------------------------------------------------------------------',
  '',
  'insert into public.resources (',
  '  id, owner_id, institution_id, institution_name, name, category, description, image,',
  '  location, available_from, available_to, available_days, open_time, close_time,',
  '  hourly_rate, daily_rate, security_deposit, required_qualifications, required_training,',
  '  supervision_required, eligibility_notes, usage_instructions, booking_conditions,',
  '  max_booking_hours, cancellation_policy, active',
  ')',
  'values',
);

const ownerId = seedUuid('account', 'owner');

const resourceRows = RESOURCES.map((resource) => {
  const institution = INSTITUTION_BY_SLUG.get(resource.institution);
  if (!institution) throw new Error(`Unknown institution slug: ${resource.institution}`);
  const days = `'{${(resource.availableDays ?? DEFAULTS.availableDays).join(',')}}'::smallint[]`;
  return `  ('${seedUuid('resource', resource.slug)}', '${ownerId}', '${seedUuid('institution', institution.slug)}', ${q(institution.name)}, ${q(resource.name)}, ${q(resource.category)}, ${q(resource.description)}, '', ${q(resource.location)}, '${availableFrom}', '${availableTo}', ${days}, ${q(resource.openTime ?? DEFAULTS.openTime)}, ${q(resource.closeTime ?? DEFAULTS.closeTime)}, ${Number(resource.hourlyRate ?? 0)}, ${Number(resource.dailyRate ?? 0)}, ${Number(resource.securityDeposit ?? 0)}, ${textArray(resource.requiredQualifications)}, ${textArray(resource.requiredTraining)}, ${resource.supervisionRequired ? 'true' : 'false'}, '', ${q(resource.usageInstructions ?? DEFAULTS.usageInstructions)}, ${q(resource.bookingConditions ?? DEFAULTS.bookingConditions)}, ${Number(resource.maxBookingHours ?? DEFAULTS.maxBookingHours)}, ${q(resource.cancellationPolicy ?? DEFAULTS.cancellationPolicy)}, true)`;
});

push(
  resourceRows.join(',\n') + '\non conflict (id) do update set\n' +
  '  owner_id = excluded.owner_id,\n' +
  '  institution_id = excluded.institution_id,\n' +
  '  institution_name = excluded.institution_name,\n' +
  '  name = excluded.name,\n' +
  '  category = excluded.category,\n' +
  '  description = excluded.description,\n' +
  '  location = excluded.location,\n' +
  '  hourly_rate = excluded.hourly_rate,\n' +
  '  daily_rate = excluded.daily_rate,\n' +
  '  security_deposit = excluded.security_deposit,\n' +
  '  required_qualifications = excluded.required_qualifications,\n' +
  '  required_training = excluded.required_training,\n' +
  '  supervision_required = excluded.supervision_required,\n' +
  '  usage_instructions = excluded.usage_instructions,\n' +
  '  booking_conditions = excluded.booking_conditions,\n' +
  '  max_booking_hours = excluded.max_booking_hours,\n' +
  '  cancellation_policy = excluded.cancellation_policy,\n' +
  '  active = true,\n' +
  '  updated_at = now();',
  '',
  '-- ---------------------------------------------------------------------------',
  '-- 5. Platform settings',
  '-- ---------------------------------------------------------------------------',
  '',
  'insert into public.platform_settings (',
  '  id, max_active_bookings, max_bookings_per_month, max_booking_hours,',
  '  institution_priority_enabled, waiting_list_enabled, auto_approval, overdue_grace_minutes',
  ')',
  'values (1, 3, 10, 4, true, true, false, 30)',
  'on conflict (id) do update set',
  '  max_active_bookings = excluded.max_active_bookings,',
  '  max_bookings_per_month = excluded.max_bookings_per_month,',
  '  max_booking_hours = excluded.max_booking_hours,',
  '  institution_priority_enabled = excluded.institution_priority_enabled,',
  '  waiting_list_enabled = excluded.waiting_list_enabled,',
  '  auto_approval = excluded.auto_approval,',
  '  overdue_grace_minutes = excluded.overdue_grace_minutes;',
  '',
  '-- ---------------------------------------------------------------------------',
  '-- 6. Restore triggers and report what landed',
  '-- ---------------------------------------------------------------------------',
  '',
  'alter table public.profiles enable trigger profiles_guard_privileges;',
  'alter table public.institutions enable trigger institutions_guard_changes;',
  '',
  'commit;',
  '',
  'select',
  '  (select count(*) from public.institutions) as institutions,',
  '  (select count(*) from public.resources where active) as active_resources,',
  '  (select count(*) from public.profiles) as profiles,',
  '  (select count(*) from auth.users where email like %@spacexchange.dev) as demo_accounts;'.replace(
    '%@spacexchange.dev',
    "'%@spacexchange.dev'",
  ),
  '',
  '-- Expect: institutions = ' + INSTITUTIONS.length + ', active_resources = ' + RESOURCES.length + '.',
  '',
);

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, lines.join('\n'), 'utf8');

console.log(`Wrote ${outFile}`);
console.log(`  institutions: ${INSTITUTIONS.length}`);
console.log(`  resources:    ${RESOURCES.length}`);
console.log(`  accounts:     ${ACCOUNTS.length}`);
