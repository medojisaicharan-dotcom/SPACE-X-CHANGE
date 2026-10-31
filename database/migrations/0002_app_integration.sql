-- ---------------------------------------------------------------------------
-- SPACEXCHANGE application integration
-- ---------------------------------------------------------------------------
-- Apply this after 0001_init.sql. It adds the pieces the browser app needs in
-- order to run against Supabase without a service-role key:
--
--   1. An auth trigger that creates a public.profiles row for every signup.
--   2. list_profile_directory() so authenticated screens can resolve names
--      without exposing emails or bypassing profile RLS wholesale.
--   3. Notification insert/delete policies for workflow notifications.
--   4. sweep_overdue_bookings() so overdue state is decided server-side.
--
-- Run it in the Supabase SQL editor or with the Supabase CLI.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Create a profile for every new auth user
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role public.app_role := 'user';
  v_role_text text;
  v_institution_id uuid;
  v_institution_name text := '';
  v_full_name text;
begin
  -- Only the three self-service roles are accepted from signup metadata.
  -- Administrator accounts are provisioned manually.
  v_role_text := coalesce(new.raw_user_meta_data ->> 'role', 'user');
  if v_role_text in ('resource_owner', 'institution_manager') then
    v_role := v_role_text::public.app_role;
  end if;

  -- institution_id is optional and must reference a real institution.
  begin
    v_institution_id := nullif(new.raw_user_meta_data ->> 'institution_id', '')::uuid;
  exception
    when others then
      v_institution_id := null;
  end;

  if v_institution_id is not null then
    select i.name into v_institution_name
    from public.institutions i
    where i.id = v_institution_id;

    if v_institution_name is null then
      v_institution_id := null;
      v_institution_name := '';
    end if;
  end if;

  if v_institution_name = '' then
    v_institution_name := coalesce(new.raw_user_meta_data ->> 'institution_name', '');
  end if;

  v_full_name := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  if v_full_name is null then
    v_full_name := split_part(coalesce(new.email, 'member'), '@', 1);
  end if;

  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    institution_id,
    institution_name,
    verified
  )
  values (
    new.id,
    coalesce(new.email, 'user-' || left(new.id::text, 8) || '@no-email.local'),
    v_full_name,
    v_role,
    v_institution_id,
    v_institution_name,
    v_role = 'user'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Backfill profiles for auth users created before this migration ran.
insert into public.profiles (
  id,
  email,
  full_name,
  role,
  institution_id,
  institution_name,
  verified
)
select
  u.id,
  coalesce(u.email, 'user-' || left(u.id::text, 8) || '@no-email.local'),
  coalesce(
    nullif(btrim(coalesce(u.raw_user_meta_data ->> 'full_name', '')), ''),
    split_part(coalesce(u.email, 'member'), '@', 1)
  ),
  case
    when u.raw_user_meta_data ->> 'role' in ('resource_owner', 'institution_manager')
      then (u.raw_user_meta_data ->> 'role')::public.app_role
    else 'user'::public.app_role
  end,
  null,
  coalesce(u.raw_user_meta_data ->> 'institution_name', ''),
  coalesce(u.raw_user_meta_data ->> 'role', 'user') = 'user'
from auth.users u
on conflict (id) do nothing;

-- Link backfilled profiles to institutions where the metadata matches one.
update public.profiles p
set institution_id = i.id,
    institution_name = i.name
from auth.users u
join public.institutions i
  on i.id::text = u.raw_user_meta_data ->> 'institution_id'
where p.id = u.id
  and p.institution_id is null;

-- ---------------------------------------------------------------------------
-- 2. Safe profile directory
-- ---------------------------------------------------------------------------
-- Profiles are otherwise only readable by the owner and oversight roles. The
-- app needs names for owners, bookers and managers, but never needs their email
-- addresses or suspension flags outside RLS, so expose a narrow read-only list.

create or replace function public.list_profile_directory()
returns table (
  id uuid,
  full_name text,
  role public.app_role,
  institution_id uuid,
  institution_name text,
  verified boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.id, p.full_name, p.role, p.institution_id, p.institution_name, p.verified
  from public.profiles p
  where p.suspended = false;
$$;

revoke all on function public.list_profile_directory() from public;
grant execute on function public.list_profile_directory() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Notification policies
-- ---------------------------------------------------------------------------
-- Workflow events (booking approved, incident reviewed, overdue) create
-- notifications for the other party. Inserts are limited to signed-in users;
-- titles and links are informational only and never grant access on their own.

drop policy if exists "Authenticated users create workflow notifications" on public.notifications;

create policy "Authenticated users create workflow notifications"
  on public.notifications for insert
  to authenticated
  with check (auth.uid() is not null);

drop policy if exists "Users delete their own notifications" on public.notifications;

create policy "Users delete their own notifications"
  on public.notifications for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. Server-side overdue sweep
-- ---------------------------------------------------------------------------

create or replace function public.sweep_overdue_bookings()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_grace integer;
  v_count integer := 0;
  r record;
begin
  select overdue_grace_minutes into v_grace
  from public.platform_settings
  where id = 1;

  v_grace := coalesce(v_grace, 30);

  for r in
    select
      b.id,
      b.user_id,
      b.owner_id,
      b.resource_id,
      res.name as resource_name
    from public.bookings b
    join public.resources res on res.id = b.resource_id
    where b.status in ('approved', 'checked_in')
      and (b.start_date::timestamp + b.end_time) + make_interval(mins => v_grace) < now()
  loop
    update public.bookings
    set status = 'overdue',
        updated_at = now()
    where id = r.id;

    insert into public.notifications (user_id, type, title, message, link)
    values
      (
        r.user_id,
        'overdue',
        'Booking overdue',
        format('Your booking for %s is past its end time. Please check out immediately.', r.resource_name),
        '/dashboard/bookings'
      ),
      (
        r.owner_id,
        'overdue',
        'Overdue return',
        format('%s is past its return time.', r.resource_name),
        '/owner/bookings'
      );

    insert into public.audit_logs (
      action,
      actor_id,
      actor_name,
      resource_id,
      resource_name,
      booking_id,
      details
    )
    values (
      'Booking marked overdue',
      r.owner_id,
      'System',
      r.resource_id,
      r.resource_name,
      r.id,
      'The booking passed its end time without check-out.'
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.sweep_overdue_bookings() from public;
grant execute on function public.sweep_overdue_bookings() to authenticated;
