-- SPACEXCHANGE reference schema for Supabase/PostgreSQL.
-- The current application build runs in local demo mode (browser storage).
-- This migration is provided for a future Supabase-backed deployment and is
-- intentionally independent of the demo seed data.

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- ---------------------------------------------------------------------------
-- Enumerated values
-- ---------------------------------------------------------------------------

create type public.app_role as enum (
  'user',
  'resource_owner',
  'institution_manager',
  'administrator'
);

create type public.booking_status as enum (
  'pending',
  'approved',
  'rejected',
  'waitlisted',
  'cancelled',
  'checked_in',
  'checked_out',
  'completed',
  'overdue'
);

create type public.waiting_status as enum (
  'waiting',
  'notified',
  'converted',
  'cancelled'
);

create type public.incident_status as enum (
  'reported',
  'under_review',
  'resolved',
  'rejected'
);

create type public.incident_category as enum (
  'damaged_equipment',
  'missing_equipment',
  'late_return',
  'misuse',
  'safety_issue',
  'scheduling_conflict',
  'other'
);

create type public.qualification_status as enum (
  'pending',
  'verified',
  'rejected'
);

create type public.notification_type as enum (
  'booking_submitted',
  'booking_approved',
  'booking_rejected',
  'booking_cancelled',
  'waitlist_update',
  'reminder',
  'checkin',
  'return',
  'overdue',
  'incident',
  'incident_update',
  'eligibility',
  'system'
);

create type public.eligibility_type as enum (
  'qualification',
  'training',
  'institution',
  'verification'
);

create type public.condition_type as enum ('initial', 'final');

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------

create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'Institution',
  location text not null default '',
  contact_email text not null default '',
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role public.app_role not null default 'user',
  institution_id uuid references public.institutions (id) on delete set null,
  institution_name text not null default '',
  verified boolean not null default false,
  suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete restrict,
  institution_id uuid references public.institutions (id) on delete set null,
  institution_name text not null default '',
  name text not null,
  category text not null,
  description text not null default '',
  image text not null default '',
  location text not null default '',
  available_from date not null default current_date,
  available_to date not null default (current_date + 365),
  available_days smallint[] not null default '{1,2,3,4,5,6}'::smallint[]
    check (available_days <@ '{0,1,2,3,4,5,6}'::smallint[]),
  open_time time not null default '08:00',
  close_time time not null default '20:00',
  blackout_dates date[] not null default '{}',
  hourly_rate numeric(10, 2) not null default 0 check (hourly_rate >= 0),
  daily_rate numeric(10, 2) not null default 0 check (daily_rate >= 0),
  security_deposit numeric(10, 2) not null default 0 check (security_deposit >= 0),
  required_qualifications text[] not null default '{}',
  required_training text[] not null default '{}',
  supervision_required boolean not null default false,
  eligibility_notes text not null default '',
  usage_instructions text not null default '',
  booking_conditions text not null default '',
  max_booking_hours smallint not null default 4 check (max_booking_hours between 1 and 24),
  cancellation_policy text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (available_to >= available_from),
  check (close_time > open_time)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete restrict,
  owner_id uuid not null references public.profiles (id) on delete restrict,
  start_date date not null,
  start_time time not null,
  end_time time not null,
  purpose text not null,
  status public.booking_status not null default 'pending',
  rejection_reason text not null default '',
  total_cost numeric(10, 2) not null default 0 check (total_cost >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  rejected_at timestamptz,
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  check (end_time > start_time),
  check (char_length(btrim(purpose)) >= 15)
);

-- Prevent double approval of overlapping slots at the database layer.
alter table public.bookings
  add constraint bookings_no_overlapping_occupancy
  exclude using gist (
    resource_id with =,
    tsrange(
      start_date::timestamp + start_time,
      start_date::timestamp + end_time,
      '[)'
    ) with &&
  )
  where (
    status = any (
      array[
        'approved'::public.booking_status,
        'checked_in'::public.booking_status,
        'overdue'::public.booking_status
      ]
    )
  );

create table public.waiting_list (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete set null,
  preferred_date date not null,
  start_time time not null,
  end_time time not null,
  purpose text not null,
  status public.waiting_status not null default 'waiting',
  created_at timestamptz not null default now(),
  check (end_time > start_time),
  check (char_length(btrim(purpose)) >= 15)
);

create table public.checkin_records (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete restrict,
  checked_in_at timestamptz not null default now(),
  photos text[] not null default '{}',
  checklist jsonb not null default '{}'::jsonb,
  notes text not null default '',
  damage_noted boolean not null default false
);

create table public.checkout_records (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete restrict,
  checked_out_at timestamptz not null default now(),
  photos text[] not null default '{}',
  checklist jsonb not null default '{}'::jsonb,
  notes text not null default '',
  returned_by text not null default ''
);

create table public.condition_reports (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  resource_id uuid not null references public.resources (id) on delete cascade,
  type public.condition_type not null,
  images text[] not null default '{}',
  checklist jsonb not null default '{}'::jsonb,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete restrict,
  reporter_name text not null,
  resource_id uuid references public.resources (id) on delete set null,
  resource_name text not null default '',
  booking_id uuid references public.bookings (id) on delete set null,
  category public.incident_category not null default 'other',
  description text not null,
  images text[] not null default '{}',
  occurred_at timestamptz not null default now(),
  status public.incident_status not null default 'reported',
  manager_notes text not null default '',
  summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(btrim(description)) >= 30)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.notification_type not null default 'system',
  title text not null,
  message text not null,
  link text not null default '',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  actor_id uuid not null references public.profiles (id) on delete restrict,
  actor_name text not null default '',
  resource_id uuid references public.resources (id) on delete set null,
  resource_name text not null default '',
  booking_id uuid references public.bookings (id) on delete set null,
  details text not null default '',
  created_at timestamptz not null default now()
);

create table public.qualifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  document_name text not null default '',
  status public.qualification_status not null default 'pending',
  reviewer_notes text not null default '',
  uploaded_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table public.eligibility_requirements (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources (id) on delete cascade,
  type public.eligibility_type not null,
  label text not null,
  mandatory boolean not null default true
);

create table public.platform_settings (
  id smallint primary key default 1 check (id = 1),
  max_active_bookings integer not null default 3 check (max_active_bookings > 0),
  max_bookings_per_month integer not null default 10 check (max_bookings_per_month > 0),
  max_booking_hours integer not null default 4 check (max_booking_hours between 1 and 24),
  institution_priority_enabled boolean not null default true,
  waiting_list_enabled boolean not null default true,
  auto_approval boolean not null default false,
  overdue_grace_minutes integer not null default 30 check (overdue_grace_minutes >= 0),
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index resources_owner_idx on public.resources (owner_id);
create index resources_institution_idx on public.resources (institution_id);
create index resources_active_category_idx on public.resources (active, category);
create index bookings_resource_date_idx on public.bookings (resource_id, start_date);
create index bookings_user_idx on public.bookings (user_id, created_at desc);
create index bookings_owner_idx on public.bookings (owner_id, created_at desc);
create index bookings_status_idx on public.bookings (status);
create index waiting_list_resource_idx on public.waiting_list (resource_id, preferred_date);
create index waiting_list_user_idx on public.waiting_list (user_id);
create index incidents_status_idx on public.incidents (status, created_at desc);
create index incidents_reporter_idx on public.incidents (reporter_id);
create index notifications_user_unread_idx on public.notifications (user_id, read, created_at desc);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);
create index qualifications_user_idx on public.qualifications (user_id, status);
create index eligibility_requirements_resource_idx on public.eligibility_requirements (resource_id);

-- ---------------------------------------------------------------------------
-- Helper functions used by RLS policies
-- ---------------------------------------------------------------------------

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_institution_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select institution_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.current_app_role() = 'administrator', false);
$$;

create or replace function public.is_manager_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.current_app_role() in ('institution_manager', 'administrator'), false);
$$;

create or replace function public.can_manage_resource(p_resource_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.resources r
    where r.id = p_resource_id
      and (
        r.owner_id = auth.uid()
        or public.is_admin()
        or (
          public.current_app_role() = 'institution_manager'
          and r.institution_id is not null
          and r.institution_id = public.current_institution_id()
        )
      )
  );
$$;

create or replace function public.can_access_booking(p_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.bookings b
    where b.id = p_booking_id
      and (
        b.user_id = auth.uid()
        or b.owner_id = auth.uid()
        or public.can_manage_resource(b.resource_id)
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- Guard triggers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if new.id is distinct from old.id
    or new.role is distinct from old.role
    or new.email is distinct from old.email
    or new.suspended is distinct from old.suspended then
    raise exception 'Only administrators may change identity, role or suspension fields.'
      using errcode = '42501';
  end if;

  if new.verified is distinct from old.verified
    and public.current_app_role() <> 'institution_manager' then
    raise exception 'Only managers or administrators may change verification status.'
      using errcode = '42501';
  end if;

  if public.current_app_role() = 'institution_manager'
    and new.id <> auth.uid()
    and (
      new.full_name is distinct from old.full_name
      or new.institution_id is distinct from old.institution_id
      or new.institution_name is distinct from old.institution_name
    ) then
    raise exception 'Managers may only change verification status on another profile.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create or replace function public.guard_institution_changes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if public.current_app_role() = 'institution_manager' then
    if new.id is distinct from old.id
      or new.name is distinct from old.name
      or new.type is distinct from old.type
      or new.location is distinct from old.location
      or new.contact_email is distinct from old.contact_email
      or new.created_at is distinct from old.created_at then
      raise exception 'Managers may only change institution verification status.'
        using errcode = '42501';
    end if;
    return new;
  end if;

  raise exception 'You are not allowed to change institutions.' using errcode = '42501';
end;
$$;

create or replace function public.guard_booking_changes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if public.can_manage_resource(new.resource_id) then
    return new;
  end if;

  if old.user_id <> auth.uid() then
    raise exception 'You may only change your own bookings.' using errcode = '42501';
  end if;

  if new.resource_id is distinct from old.resource_id
    or new.user_id is distinct from old.user_id
    or new.owner_id is distinct from old.owner_id
    or new.start_date is distinct from old.start_date
    or new.start_time is distinct from old.start_time
    or new.end_time is distinct from old.end_time
    or new.purpose is distinct from old.purpose
    or new.total_cost is distinct from old.total_cost then
    raise exception 'Booking slot and ownership fields cannot be changed by the requester.'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status and not (
    (old.status = 'pending' and new.status = 'cancelled')
    or (old.status = 'waitlisted' and new.status = 'cancelled')
    or (old.status = 'approved' and new.status in ('cancelled', 'checked_in'))
    or (old.status in ('checked_in', 'overdue') and new.status = 'checked_out')
  ) then
    raise exception 'That booking status transition is not allowed for the requester.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger institutions_guard_changes
  before update on public.institutions
  for each row execute function public.guard_institution_changes();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger profiles_guard_privileges
  before update on public.profiles
  for each row execute function public.protect_profile_privileges();

create trigger resources_updated_at
  before update on public.resources
  for each row execute function public.set_updated_at();

create trigger bookings_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

create trigger bookings_guard_changes
  before update on public.bookings
  for each row execute function public.guard_booking_changes();

create trigger incidents_updated_at
  before update on public.incidents
  for each row execute function public.set_updated_at();

create trigger platform_settings_updated_at
  before update on public.platform_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.institutions enable row level security;
alter table public.profiles enable row level security;
alter table public.resources enable row level security;
alter table public.bookings enable row level security;
alter table public.waiting_list enable row level security;
alter table public.checkin_records enable row level security;
alter table public.checkout_records enable row level security;
alter table public.condition_reports enable row level security;
alter table public.incidents enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.qualifications enable row level security;
alter table public.eligibility_requirements enable row level security;
alter table public.platform_settings enable row level security;

-- Institutions: verified institutions are public; managers/admins see all.
create policy "Institutions are publicly readable when verified"
  on public.institutions for select
  using (verified or public.is_manager_or_admin());

create policy "Managers and admins add institutions"
  on public.institutions for insert
  with check (public.is_manager_or_admin() and verified = false);

create policy "Managers and admins update institutions"
  on public.institutions for update
  using (public.is_manager_or_admin())
  with check (public.is_manager_or_admin());

create policy "Admins delete institutions"
  on public.institutions for delete
  using (public.is_admin());

-- Profiles: users read/update themselves; admins manage all.
create policy "Profiles visible to self and oversight roles"
  on public.profiles for select
  using (
    id = auth.uid()
    or public.is_admin()
    or (
      public.current_app_role() = 'institution_manager'
      and institution_id is not null
      and institution_id = public.current_institution_id()
    )
  );

create policy "Users create their own member profile"
  on public.profiles for insert
  with check (
    id = auth.uid()
    and role = 'user'
    and verified = false
    and suspended = false
  );

create policy "Users and oversight roles update profiles"
  on public.profiles for update
  using (id = auth.uid() or public.is_manager_or_admin())
  with check (id = auth.uid() or public.is_manager_or_admin());

create policy "Admins delete profiles"
  on public.profiles for delete
  using (public.is_admin());

-- Resources: active listings are public; managers/owners see their own inventory.
create policy "Active resources are publicly readable"
  on public.resources for select
  using (active or public.can_manage_resource(id) or public.is_manager_or_admin());

create policy "Owners create resources for themselves"
  on public.resources for insert
  with check (
    owner_id = auth.uid()
    and public.current_app_role() in ('resource_owner', 'administrator')
  );

create policy "Owners and managers update their resources"
  on public.resources for update
  using (public.can_manage_resource(id))
  with check (public.can_manage_resource(id));

create policy "Owners and admins delete their resources"
  on public.resources for delete
  using (public.can_manage_resource(id));

-- Bookings: participants and oversight roles only.
create policy "Booking participants and managers can read bookings"
  on public.bookings for select
  using (user_id = auth.uid() or public.can_manage_resource(resource_id));

create policy "Members create their own booking requests"
  on public.bookings for insert
  with check (
    user_id = auth.uid()
    and status in ('pending', 'waitlisted')
  );

create policy "Participants and managers can update bookings"
  on public.bookings for update
  using (user_id = auth.uid() or public.can_manage_resource(resource_id))
  with check (user_id = auth.uid() or public.can_manage_resource(resource_id));

create policy "Admins can delete bookings"
  on public.bookings for delete
  using (public.is_admin());

-- Waiting list.
create policy "Waiting list visible to requester and managers"
  on public.waiting_list for select
  using (user_id = auth.uid() or public.can_manage_resource(resource_id));

create policy "Members join the waiting list for themselves"
  on public.waiting_list for insert
  with check (user_id = auth.uid());

create policy "Requester and managers update waiting-list entries"
  on public.waiting_list for update
  using (user_id = auth.uid() or public.can_manage_resource(resource_id))
  with check (user_id = auth.uid() or public.can_manage_resource(resource_id));

create policy "Requester and managers delete waiting-list entries"
  on public.waiting_list for delete
  using (user_id = auth.uid() or public.can_manage_resource(resource_id));

-- Handover records are append-only.
create policy "Booking participants can read check-in records"
  on public.checkin_records for select
  using (public.can_access_booking(booking_id));

create policy "Booking participants can create check-in records"
  on public.checkin_records for insert
  with check (user_id = auth.uid() and public.can_access_booking(booking_id));

create policy "Booking participants can read check-out records"
  on public.checkout_records for select
  using (public.can_access_booking(booking_id));

create policy "Booking participants can create check-out records"
  on public.checkout_records for insert
  with check (user_id = auth.uid() and public.can_access_booking(booking_id));

create policy "Booking participants can read condition reports"
  on public.condition_reports for select
  using (public.can_access_booking(booking_id));

create policy "Booking participants can create condition reports"
  on public.condition_reports for insert
  with check (public.can_access_booking(booking_id));

-- Incidents.
create policy "Incidents visible to reporter, resource manager and oversight"
  on public.incidents for select
  using (
    reporter_id = auth.uid()
    or (resource_id is not null and public.can_manage_resource(resource_id))
    or public.is_manager_or_admin()
  );

create policy "Members report incidents as themselves"
  on public.incidents for insert
  with check (
    reporter_id = auth.uid()
    and status = 'reported'
    and manager_notes = ''
  );

create policy "Managers review incidents"
  on public.incidents for update
  using (public.is_manager_or_admin())
  with check (public.is_manager_or_admin());

-- Notifications: read/update own only. Inserts are expected from trusted
-- server-side code using the service-role key.
create policy "Users read their own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "Users mark their own notifications as read"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Audit log: append-only and visible to the actor, resource managers and oversight.
create policy "Audit entries visible to actor and oversight"
  on public.audit_logs for select
  using (
    actor_id = auth.uid()
    or (resource_id is not null and public.can_manage_resource(resource_id))
    or public.is_manager_or_admin()
  );

create policy "Authenticated actors append audit entries"
  on public.audit_logs for insert
  with check (actor_id = auth.uid());

-- Qualifications/evidence.
create policy "Evidence visible to owner and oversight"
  on public.qualifications for select
  using (user_id = auth.uid() or public.is_manager_or_admin());

create policy "Members upload their own pending evidence"
  on public.qualifications for insert
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and reviewed_at is null
  );

create policy "Managers review evidence"
  on public.qualifications for update
  using (public.is_manager_or_admin())
  with check (public.is_manager_or_admin());

create policy "Members delete their own pending evidence"
  on public.qualifications for delete
  using (
    public.is_admin()
    or (user_id = auth.uid() and status = 'pending')
  );

-- Eligibility requirements.
create policy "Eligibility requirements are readable"
  on public.eligibility_requirements for select
  using (true);

create policy "Admins manage eligibility requirements"
  on public.eligibility_requirements for all
  using (public.is_admin())
  with check (public.is_admin());

-- Platform settings.
create policy "Platform settings are readable"
  on public.platform_settings for select
  using (true);

create policy "Admins update platform settings"
  on public.platform_settings for update
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Privileges (RLS still applies to all authenticated access)
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select on public.institutions to anon;
grant select on public.resources to anon;
grant select on public.eligibility_requirements to anon;
grant select on public.platform_settings to anon;

grant select, insert, update, delete on all tables in schema public to authenticated;
