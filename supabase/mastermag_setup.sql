-- MasterMag – vollständiges Supabase-Schema
-- Dieses Skript in einem neuen Supabase-Projekt einmal vollständig im SQL Editor ausführen.

begin;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

create type public.profession_type as enum ('elektroinstallateur', 'montageelektriker');
create type public.profession_scope_type as enum ('elektroinstallateur', 'montageelektriker', 'both');
create type public.booking_status_type as enum ('confirmed', 'cancelled');
create type public.actor_type as enum ('learner', 'admin');
create type public.block_type as enum ('holiday', 'internal', 'maintenance', 'setup', 'repair', 'other');
create type public.credit_transaction_type as enum (
  'booking_debit',
  'cancellation_refund',
  'global_reset',
  'admin_adjustment'
);

create table public.app_admin (
  singleton_id smallint primary key default 1 check (singleton_id = 1),
  user_id uuid not null unique references auth.users (id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.learners (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (char_length(trim(first_name)) between 1 and 100),
  last_name text not null check (char_length(trim(last_name)) between 1 and 100),
  email extensions.citext not null unique,
  birth_date date not null,
  apprenticeship_year smallint not null check (apprenticeship_year between 1 and 4),
  profession public.profession_type not null,
  school_weekday smallint check (school_weekday between 1 and 5),
  credit_balance smallint not null default 5 check (credit_balance between 0 and 5),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learners_email_normalized check (email = lower(trim(email::text))::extensions.citext)
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 160),
  short_description text not null check (char_length(trim(short_description)) between 1 and 600),
  duration_days smallint not null check (duration_days between 1 and 5),
  minimum_apprenticeship_year smallint not null check (minimum_apprenticeship_year between 1 and 4),
  profession_scope public.profession_scope_type not null default 'both',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.boxes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(trim(name)) between 1 and 100),
  description text check (description is null or char_length(trim(description)) <= 500),
  display_order integer not null default 0 check (display_order >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.box_blocks (
  id uuid primary key default gen_random_uuid(),
  box_id uuid references public.boxes (id) on delete restrict,
  start_date date not null,
  end_date date not null,
  title text not null check (char_length(trim(title)) between 1 and 160),
  reason text check (reason is null or char_length(trim(reason)) <= 500),
  block_type public.block_type not null default 'other',
  created_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint box_blocks_date_order check (end_date >= start_date)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learners (id) on delete restrict,
  course_id uuid not null references public.courses (id) on delete restrict,
  box_id uuid not null references public.boxes (id) on delete restrict,
  status public.booking_status_type not null default 'confirmed',
  course_title_snapshot text not null,
  course_description_snapshot text not null,
  course_duration_snapshot smallint not null check (course_duration_snapshot between 1 and 5),
  course_minimum_year_snapshot smallint not null check (course_minimum_year_snapshot between 1 and 4),
  course_profession_scope_snapshot public.profession_scope_type not null,
  school_weekday_snapshot smallint check (school_weekday_snapshot between 1 and 5),
  school_holiday_mode boolean not null default false,
  business_rules_overridden boolean not null default false,
  created_by_type public.actor_type not null,
  created_by_admin_id uuid references auth.users (id) on delete restrict,
  first_booking_date date not null,
  last_booking_date date not null,
  cancelled_at timestamptz,
  cancelled_by_type public.actor_type,
  cancelled_by_admin_id uuid references auth.users (id) on delete restrict,
  cancelled_by_learner_id uuid references public.learners (id) on delete restrict,
  cancellation_reason text check (cancellation_reason is null or char_length(trim(cancellation_reason)) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_date_order check (last_booking_date >= first_booking_date),
  constraint bookings_seven_day_window check (last_booking_date - first_booking_date <= 6),
  constraint bookings_creator_consistency check (
    (created_by_type = 'learner' and created_by_admin_id is null)
    or (created_by_type = 'admin' and created_by_admin_id is not null)
  ),
  constraint bookings_cancellation_consistency check (
    (status = 'confirmed' and cancelled_at is null and cancelled_by_type is null)
    or (status = 'cancelled' and cancelled_at is not null and cancelled_by_type is not null)
  )
);

create table public.booking_days (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete restrict,
  learner_id uuid not null references public.learners (id) on delete restrict,
  box_id uuid not null references public.boxes (id) on delete restrict,
  booking_date date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint booking_days_weekday_only check (extract(isodow from booking_date) between 1 and 5)
);

create unique index booking_days_one_active_box_per_date
  on public.booking_days (box_id, booking_date)
  where is_active;

create unique index booking_days_one_active_learner_per_date
  on public.booking_days (learner_id, booking_date)
  where is_active;

create index booking_days_booking_idx on public.booking_days (booking_id);
create index booking_days_date_idx on public.booking_days (booking_date) where is_active;
create index bookings_learner_idx on public.bookings (learner_id, created_at desc);
create index bookings_course_idx on public.bookings (course_id, created_at desc);
create index bookings_box_dates_idx on public.bookings (box_id, first_booking_date, last_booking_date);
create index box_blocks_dates_idx on public.box_blocks (start_date, end_date, box_id);
create index learners_active_idx on public.learners (active) where active;
create index courses_active_idx on public.courses (active) where active;
create index boxes_active_order_idx on public.boxes (display_order, name) where active;

create table public.credit_reset_runs (
  id uuid primary key default gen_random_uuid(),
  executed_by_admin_id uuid not null references auth.users (id) on delete restrict,
  learner_count integer not null default 0 check (learner_count >= 0),
  executed_at timestamptz not null default now()
);

create table public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learners (id) on delete restrict,
  booking_id uuid references public.bookings (id) on delete restrict,
  reset_run_id uuid references public.credit_reset_runs (id) on delete restrict,
  transaction_type public.credit_transaction_type not null,
  delta smallint not null check (delta between -5 and 5),
  balance_before smallint not null check (balance_before between 0 and 5),
  balance_after smallint not null check (balance_after between 0 and 5),
  note text check (note is null or char_length(trim(note)) <= 500),
  created_by_admin_id uuid references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint credit_transaction_math check (balance_after = balance_before + delta)
);

create index credit_transactions_learner_idx
  on public.credit_transactions (learner_id, created_at desc);
create index credit_transactions_booking_idx
  on public.credit_transactions (booking_id) where booking_id is not null;

create table public.learner_sessions (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learners (id) on delete cascade,
  token_hash bytea not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_accessed_at timestamptz not null default now(),
  constraint learner_session_expiry check (expires_at > created_at)
);

create index learner_sessions_lookup_idx
  on public.learner_sessions (token_hash, expires_at)
  where revoked_at is null;
create index learner_sessions_expiry_idx on public.learner_sessions (expires_at);

create table public.learner_auth_attempts (
  id bigint generated always as identity primary key,
  email_hash bytea not null,
  succeeded boolean not null default false,
  attempted_at timestamptz not null default now()
);

create index learner_auth_attempts_limit_idx
  on public.learner_auth_attempts (email_hash, attempted_at desc)
  where not succeeded;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger learners_set_updated_at before update on public.learners
for each row execute function public.set_updated_at();
create trigger courses_set_updated_at before update on public.courses
for each row execute function public.set_updated_at();
create trigger boxes_set_updated_at before update on public.boxes
for each row execute function public.set_updated_at();
create trigger bookings_set_updated_at before update on public.bookings
for each row execute function public.set_updated_at();

create or replace function public.normalize_learner_email()
returns trigger
language plpgsql
set search_path = pg_catalog, public, extensions
as $$
begin
  new.email := lower(trim(new.email::text))::extensions.citext;
  return new;
end;
$$;

create trigger learners_normalize_email
before insert or update of email on public.learners
for each row execute function public.normalize_learner_email();

create or replace function public.prevent_credit_transaction_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'CREDIT_HISTORY_IMMUTABLE';
end;
$$;

create trigger credit_transactions_immutable
before update or delete on public.credit_transactions
for each row execute function public.prevent_credit_transaction_mutation();

create or replace function public.app_today()
returns date
language sql
stable
set search_path = pg_catalog
as $$
  select (current_timestamp at time zone 'Europe/Zurich')::date;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.app_admin a
    where a.user_id = auth.uid()
  );
$$;

create or replace function public.require_admin()
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not public.is_admin() then
    raise exception 'NOT_ADMIN';
  end if;
  return v_user_id;
end;
$$;

create or replace function public.enforce_booking_day_consistency()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_booking public.bookings%rowtype;
begin
  select * into v_booking from public.bookings where id = new.booking_id;
  if not found then
    raise exception 'BOOKING_NOT_FOUND';
  end if;
  if new.learner_id <> v_booking.learner_id or new.box_id <> v_booking.box_id then
    raise exception 'BOOKING_DAY_INCONSISTENT';
  end if;
  if new.booking_date < v_booking.first_booking_date or new.booking_date > v_booking.last_booking_date then
    raise exception 'BOOKING_DAY_OUTSIDE_WINDOW';
  end if;
  if new.is_active and v_booking.status <> 'confirmed' then
    raise exception 'CANCELLED_BOOKING_DAY_CANNOT_BE_ACTIVE';
  end if;
  return new;
end;
$$;

create trigger booking_days_consistency
before insert or update on public.booking_days
for each row execute function public.enforce_booking_day_consistency();

create or replace function public.prevent_block_booking_conflict()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if exists (
    select 1
    from public.booking_days bd
    where bd.is_active
      and bd.booking_date between new.start_date and new.end_date
      and (new.box_id is null or bd.box_id = new.box_id)
  ) then
    raise exception 'BLOCK_CONFLICT';
  end if;
  return new;
end;
$$;

create trigger box_blocks_prevent_booking_conflict
before insert or update on public.box_blocks
for each row execute function public.prevent_block_booking_conflict();

create or replace function public.validate_learner_session(
  p_session_token text,
  p_touch boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_learner_id uuid;
  v_session_id uuid;
begin
  if p_session_token is null or char_length(p_session_token) < 40 then
    raise exception 'SESSION_EXPIRED';
  end if;

  select s.id, s.learner_id
    into v_session_id, v_learner_id
  from public.learner_sessions s
  join public.learners l on l.id = s.learner_id
  where s.token_hash = extensions.digest(convert_to(p_session_token, 'UTF8'), 'sha256')
    and s.revoked_at is null
    and s.expires_at > now()
    and l.active
  limit 1;

  if v_learner_id is null then
    raise exception 'SESSION_EXPIRED';
  end if;

  if p_touch then
    update public.learner_sessions
      set last_accessed_at = now()
      where id = v_session_id;
  end if;

  return v_learner_id;
end;
$$;

create or replace function public.create_learner_session(
  p_email text,
  p_birth_date date
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_email_hash bytea;
  v_failed_count integer;
  v_learner_id uuid;
  v_token text;
  v_expires_at timestamptz := now() + interval '2 hours';
begin
  v_email_hash := extensions.digest(convert_to(v_email, 'UTF8'), 'sha256');

  delete from public.learner_sessions where expires_at < now() - interval '1 day';
  delete from public.learner_auth_attempts where attempted_at < now() - interval '1 day';

  select count(*) into v_failed_count
  from public.learner_auth_attempts
  where email_hash = v_email_hash
    and not succeeded
    and attempted_at >= now() - interval '15 minutes';

  if v_failed_count >= 5 then
    return jsonb_build_object('ok', false, 'error_code', 'RATE_LIMITED');
  end if;

  select id into v_learner_id
  from public.learners
  where email = v_email::extensions.citext
    and birth_date = p_birth_date
    and active
  limit 1;

  if v_learner_id is null then
    insert into public.learner_auth_attempts (email_hash, succeeded)
    values (v_email_hash, false);
    return jsonb_build_object('ok', false, 'error_code', 'INVALID_LEARNER_CREDENTIALS');
  end if;

  insert into public.learner_auth_attempts (email_hash, succeeded)
  values (v_email_hash, true);

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.learner_sessions (learner_id, token_hash, expires_at)
  values (
    v_learner_id,
    extensions.digest(convert_to(v_token, 'UTF8'), 'sha256'),
    v_expires_at
  );

  return jsonb_build_object(
    'ok', true,
    'session_token', v_token,
    'expires_at', v_expires_at
  );
end;
$$;

create or replace function public.revoke_learner_session(p_session_token text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
begin
  update public.learner_sessions
  set revoked_at = now()
  where token_hash = extensions.digest(convert_to(coalesce(p_session_token, ''), 'UTF8'), 'sha256')
    and revoked_at is null;
  return found;
end;
$$;

create or replace function public.set_learner_school_day(
  p_session_token text,
  p_school_weekday smallint
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_learner_id uuid;
begin
  v_learner_id := public.validate_learner_session(p_session_token);
  if p_school_weekday not between 1 and 5 then
    raise exception 'INVALID_SCHOOL_DAY';
  end if;

  update public.learners
  set school_weekday = p_school_weekday
  where id = v_learner_id;

  return jsonb_build_object('school_weekday', p_school_weekday);
end;
$$;

create or replace function public.get_learner_portal_data(p_session_token text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_learner_id uuid;
  v_learner public.learners%rowtype;
  v_courses jsonb;
  v_bookings jsonb;
begin
  v_learner_id := public.validate_learner_session(p_session_token);
  select * into strict v_learner from public.learners where id = v_learner_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', c.id,
      'title', c.title,
      'short_description', c.short_description,
      'duration_days', c.duration_days,
      'minimum_apprenticeship_year', c.minimum_apprenticeship_year,
      'profession_scope', c.profession_scope,
      'can_book', v_learner.credit_balance >= c.duration_days
    ) order by c.title
  ), '[]'::jsonb)
  into v_courses
  from public.courses c
  where c.active
    and v_learner.apprenticeship_year >= c.minimum_apprenticeship_year
    and (c.profession_scope = 'both' or c.profession_scope::text = v_learner.profession::text);

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', b.id,
      'booking_number', upper(substr(b.id::text, 1, 8)),
      'status', b.status,
      'course_title', b.course_title_snapshot,
      'course_description', b.course_description_snapshot,
      'box_name', bx.name,
      'dates', coalesce((
        select jsonb_agg(to_char(bd.booking_date, 'YYYY-MM-DD') order by bd.booking_date)
        from public.booking_days bd
        where bd.booking_id = b.id and bd.is_active
      ), '[]'::jsonb),
      'first_booking_date', b.first_booking_date,
      'last_booking_date', b.last_booking_date,
      'school_holiday_mode', b.school_holiday_mode,
      'can_cancel', b.status = 'confirmed'
        and b.first_booking_date >= public.app_today() + 14,
      'cancellation_reason', b.cancellation_reason,
      'created_at', b.created_at
    ) order by b.first_booking_date desc, b.created_at desc
  ), '[]'::jsonb)
  into v_bookings
  from public.bookings b
  join public.boxes bx on bx.id = b.box_id
  where b.learner_id = v_learner_id;

  return jsonb_build_object(
    'learner', jsonb_build_object(
      'id', v_learner.id,
      'first_name', v_learner.first_name,
      'last_name', v_learner.last_name,
      'profession', v_learner.profession,
      'apprenticeship_year', v_learner.apprenticeship_year,
      'school_weekday', v_learner.school_weekday,
      'credit_balance', v_learner.credit_balance
    ),
    'courses', v_courses,
    'bookings', v_bookings
  );
end;
$$;

create or replace function public.get_course_box_availability(
  p_session_token text,
  p_course_id uuid,
  p_start_date date,
  p_school_holiday_mode boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_learner_id uuid;
  v_learner public.learners%rowtype;
  v_course public.courses%rowtype;
  v_boxes jsonb;
begin
  v_learner_id := public.validate_learner_session(p_session_token);
  select * into strict v_learner from public.learners where id = v_learner_id;
  select * into v_course from public.courses where id = p_course_id and active;

  if v_course.id is null
    or v_learner.apprenticeship_year < v_course.minimum_apprenticeship_year
    or not (v_course.profession_scope = 'both' or v_course.profession_scope::text = v_learner.profession::text) then
    raise exception 'COURSE_NOT_ELIGIBLE';
  end if;
  if v_learner.credit_balance < v_course.duration_days then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;
  if p_start_date < public.app_today() then
    raise exception 'DATE_IN_PAST';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', available.id,
      'name', available.name,
      'dates', available.dates
    ) order by available.display_order, available.name
  ), '[]'::jsonb)
  into v_boxes
  from (
    select
      bx.id,
      bx.name,
      bx.display_order,
      jsonb_agg(to_char(valid_dates.booking_date, 'YYYY-MM-DD') order by valid_dates.booking_date) as dates,
      count(*) as valid_count
    from public.boxes bx
    cross join lateral (
      select day_value::date as booking_date
      from generate_series(
        p_start_date::timestamp,
        (p_start_date + 6)::timestamp,
        interval '1 day'
      ) day_value
      where extract(isodow from day_value) between 1 and 5
        and (p_school_holiday_mode or extract(isodow from day_value)::smallint <> v_learner.school_weekday)
        and not exists (
          select 1 from public.box_blocks bb
          where day_value::date between bb.start_date and bb.end_date
            and (bb.box_id is null or bb.box_id = bx.id)
        )
        and not exists (
          select 1 from public.booking_days bd
          where bd.is_active
            and bd.booking_date = day_value::date
            and (bd.box_id = bx.id or bd.learner_id = v_learner_id)
        )
    ) valid_dates
    where bx.active
    group by bx.id, bx.name, bx.display_order
    having count(*) >= v_course.duration_days
  ) available;

  return jsonb_build_object(
    'course_id', v_course.id,
    'start_date', p_start_date,
    'end_date', p_start_date + 6,
    'required_days', v_course.duration_days,
    'boxes', v_boxes
  );
end;
$$;

create or replace function public.lock_booking_resources(
  p_learner_id uuid,
  p_box_id uuid,
  p_dates date[]
)
returns void
language plpgsql
set search_path = pg_catalog
as $$
declare
  v_date date;
begin
  for v_date in select distinct unnest(p_dates) order by 1 loop
    perform pg_advisory_xact_lock(hashtextextended('box:' || p_box_id::text || ':' || v_date::text, 0));
    perform pg_advisory_xact_lock(hashtextextended('learner:' || p_learner_id::text || ':' || v_date::text, 0));
  end loop;
end;
$$;

create or replace function public.assert_physical_booking_rules(
  p_learner_id uuid,
  p_box_id uuid,
  p_dates date[],
  p_required_days smallint,
  p_exclude_booking_id uuid default null
)
returns void
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_first date;
  v_last date;
begin
  if p_dates is null or array_length(p_dates, 1) <> p_required_days then
    raise exception 'WRONG_DAY_COUNT';
  end if;
  if (select count(distinct day_value) from unnest(p_dates) day_value) <> p_required_days then
    raise exception 'DUPLICATE_DATES';
  end if;

  select min(day_value), max(day_value) into v_first, v_last from unnest(p_dates) day_value;
  if v_last - v_first > 6 then
    raise exception 'SEVEN_DAY_WINDOW_EXCEEDED';
  end if;
  if exists (select 1 from unnest(p_dates) day_value where extract(isodow from day_value) not between 1 and 5) then
    raise exception 'WEEKEND_NOT_ALLOWED';
  end if;
  if exists (select 1 from unnest(p_dates) day_value where day_value < public.app_today()) then
    raise exception 'DATE_IN_PAST';
  end if;
  if not exists (select 1 from public.boxes where id = p_box_id and active) then
    raise exception 'BOX_NOT_AVAILABLE';
  end if;

  perform public.lock_booking_resources(p_learner_id, p_box_id, p_dates);

  if exists (
    select 1
    from public.box_blocks bb
    join unnest(p_dates) day_value on day_value between bb.start_date and bb.end_date
    where bb.box_id is null or bb.box_id = p_box_id
  ) then
    raise exception 'BLOCKED_DATE';
  end if;

  if exists (
    select 1
    from public.booking_days bd
    where bd.is_active
      and bd.booking_date = any(p_dates)
      and (bd.box_id = p_box_id or bd.learner_id = p_learner_id)
      and (p_exclude_booking_id is null or bd.booking_id <> p_exclude_booking_id)
  ) then
    raise exception 'BOOKING_CONFLICT';
  end if;
end;
$$;

create or replace function public.create_learner_booking(
  p_session_token text,
  p_course_id uuid,
  p_box_id uuid,
  p_dates date[],
  p_school_holiday_mode boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_learner_id uuid;
  v_learner public.learners%rowtype;
  v_course public.courses%rowtype;
  v_booking_id uuid;
  v_first date;
  v_last date;
  v_before smallint;
  v_after smallint;
begin
  v_learner_id := public.validate_learner_session(p_session_token);
  select * into strict v_learner from public.learners where id = v_learner_id for update;
  select * into v_course from public.courses where id = p_course_id and active for share;

  if v_course.id is null
    or v_learner.apprenticeship_year < v_course.minimum_apprenticeship_year
    or not (v_course.profession_scope = 'both' or v_course.profession_scope::text = v_learner.profession::text) then
    raise exception 'COURSE_NOT_ELIGIBLE';
  end if;
  if v_learner.credit_balance < v_course.duration_days then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;
  if not p_school_holiday_mode and v_learner.school_weekday is null then
    raise exception 'SCHOOL_DAY_REQUIRED';
  end if;
  if not p_school_holiday_mode and exists (
    select 1 from unnest(p_dates) day_value
    where extract(isodow from day_value)::smallint = v_learner.school_weekday
  ) then
    raise exception 'SCHOOL_DAY_NOT_ALLOWED';
  end if;

  perform public.assert_physical_booking_rules(
    v_learner_id, p_box_id, p_dates, v_course.duration_days, null
  );
  select min(day_value), max(day_value) into v_first, v_last from unnest(p_dates) day_value;

  insert into public.bookings (
    learner_id, course_id, box_id,
    course_title_snapshot, course_description_snapshot, course_duration_snapshot,
    course_minimum_year_snapshot, course_profession_scope_snapshot,
    school_weekday_snapshot, school_holiday_mode,
    created_by_type, first_booking_date, last_booking_date
  ) values (
    v_learner_id, v_course.id, p_box_id,
    v_course.title, v_course.short_description, v_course.duration_days,
    v_course.minimum_apprenticeship_year, v_course.profession_scope,
    v_learner.school_weekday, p_school_holiday_mode,
    'learner', v_first, v_last
  ) returning id into v_booking_id;

  insert into public.booking_days (booking_id, learner_id, box_id, booking_date)
  select v_booking_id, v_learner_id, p_box_id, day_value
  from unnest(p_dates) day_value;

  v_before := v_learner.credit_balance;
  v_after := v_before - v_course.duration_days;
  update public.learners set credit_balance = v_after where id = v_learner_id;

  insert into public.credit_transactions (
    learner_id, booking_id, transaction_type, delta, balance_before, balance_after, note
  ) values (
    v_learner_id, v_booking_id, 'booking_debit', -v_course.duration_days,
    v_before, v_after, 'Credit-Abzug bei verbindlicher Kursbuchung'
  );

  return jsonb_build_object(
    'booking_id', v_booking_id,
    'booking_number', upper(substr(v_booking_id::text, 1, 8)),
    'credit_balance', v_after,
    'box_id', p_box_id,
    'dates', to_jsonb(p_dates)
  );
exception
  when unique_violation then
    raise exception 'BOOKING_CONFLICT';
end;
$$;

create or replace function public.cancel_booking_internal(
  p_booking_id uuid,
  p_actor public.actor_type,
  p_admin_id uuid default null,
  p_reason text default null
)
returns jsonb
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_booking public.bookings%rowtype;
  v_learner public.learners%rowtype;
  v_after smallint;
  v_delta smallint;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if v_booking.id is null then raise exception 'BOOKING_NOT_FOUND'; end if;
  if v_booking.status <> 'confirmed' then raise exception 'BOOKING_NOT_ACTIVE'; end if;

  select * into strict v_learner from public.learners where id = v_booking.learner_id for update;
  v_after := least(5, v_learner.credit_balance + v_booking.course_duration_snapshot);
  v_delta := v_after - v_learner.credit_balance;

  update public.booking_days set is_active = false
  where booking_id = p_booking_id and is_active;

  update public.bookings
  set status = 'cancelled',
      cancelled_at = now(),
      cancelled_by_type = p_actor,
      cancelled_by_admin_id = case when p_actor = 'admin' then p_admin_id else null end,
      cancelled_by_learner_id = case when p_actor = 'learner' then v_booking.learner_id else null end,
      cancellation_reason = nullif(trim(p_reason), '')
  where id = p_booking_id;

  update public.learners set credit_balance = v_after where id = v_booking.learner_id;

  insert into public.credit_transactions (
    learner_id, booking_id, transaction_type, delta, balance_before, balance_after,
    note, created_by_admin_id
  ) values (
    v_booking.learner_id, p_booking_id, 'cancellation_refund', v_delta,
    v_learner.credit_balance, v_after,
    'Credit-Rückerstattung nach Stornierung', p_admin_id
  );

  return jsonb_build_object(
    'booking_id', p_booking_id,
    'status', 'cancelled',
    'credit_balance', v_after,
    'refunded_credits', v_delta
  );
end;
$$;

create or replace function public.cancel_learner_booking(
  p_session_token text,
  p_booking_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_learner_id uuid;
  v_booking public.bookings%rowtype;
begin
  v_learner_id := public.validate_learner_session(p_session_token);
  select * into v_booking from public.bookings where id = p_booking_id;
  if v_booking.id is null or v_booking.learner_id <> v_learner_id then
    raise exception 'BOOKING_NOT_FOUND';
  end if;
  if v_booking.first_booking_date < public.app_today() + 14 then
    raise exception 'CANCELLATION_TOO_LATE';
  end if;
  return public.cancel_booking_internal(p_booking_id, 'learner', null, null);
end;
$$;

create or replace function public.admin_create_booking(
  p_learner_id uuid,
  p_course_id uuid,
  p_box_id uuid,
  p_dates date[],
  p_override_business_rules boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_admin_id uuid;
  v_learner public.learners%rowtype;
  v_course public.courses%rowtype;
  v_booking_id uuid;
  v_first date;
  v_last date;
  v_before smallint;
  v_after smallint;
begin
  v_admin_id := public.require_admin();
  select * into v_learner from public.learners where id = p_learner_id and active for update;
  select * into v_course from public.courses where id = p_course_id for share;
  if v_learner.id is null then raise exception 'LEARNER_NOT_ACTIVE'; end if;
  if v_course.id is null then raise exception 'COURSE_NOT_FOUND'; end if;

  if not p_override_business_rules then
    if not v_course.active
      or v_learner.apprenticeship_year < v_course.minimum_apprenticeship_year
      or not (v_course.profession_scope = 'both' or v_course.profession_scope::text = v_learner.profession::text) then
      raise exception 'COURSE_NOT_ELIGIBLE';
    end if;
    if v_learner.school_weekday is not null and exists (
      select 1 from unnest(p_dates) day_value
      where extract(isodow from day_value)::smallint = v_learner.school_weekday
    ) then
      raise exception 'SCHOOL_DAY_NOT_ALLOWED';
    end if;
  end if;

  if v_learner.credit_balance < v_course.duration_days then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  perform public.assert_physical_booking_rules(
    v_learner.id, p_box_id, p_dates, v_course.duration_days, null
  );
  select min(day_value), max(day_value) into v_first, v_last from unnest(p_dates) day_value;

  insert into public.bookings (
    learner_id, course_id, box_id,
    course_title_snapshot, course_description_snapshot, course_duration_snapshot,
    course_minimum_year_snapshot, course_profession_scope_snapshot,
    school_weekday_snapshot, school_holiday_mode, business_rules_overridden,
    created_by_type, created_by_admin_id, first_booking_date, last_booking_date
  ) values (
    v_learner.id, v_course.id, p_box_id,
    v_course.title, v_course.short_description, v_course.duration_days,
    v_course.minimum_apprenticeship_year, v_course.profession_scope,
    v_learner.school_weekday, false, p_override_business_rules,
    'admin', v_admin_id, v_first, v_last
  ) returning id into v_booking_id;

  insert into public.booking_days (booking_id, learner_id, box_id, booking_date)
  select v_booking_id, v_learner.id, p_box_id, day_value from unnest(p_dates) day_value;

  v_before := v_learner.credit_balance;
  v_after := v_before - v_course.duration_days;
  update public.learners set credit_balance = v_after where id = v_learner.id;
  insert into public.credit_transactions (
    learner_id, booking_id, transaction_type, delta, balance_before, balance_after,
    note, created_by_admin_id
  ) values (
    v_learner.id, v_booking_id, 'booking_debit', -v_course.duration_days,
    v_before, v_after, 'Credit-Abzug bei manueller Admin-Buchung', v_admin_id
  );

  return jsonb_build_object('booking_id', v_booking_id, 'credit_balance', v_after);
exception
  when unique_violation then raise exception 'BOOKING_CONFLICT';
end;
$$;

create or replace function public.admin_move_booking(
  p_booking_id uuid,
  p_box_id uuid,
  p_dates date[],
  p_override_business_rules boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_admin_id uuid;
  v_booking public.bookings%rowtype;
  v_learner public.learners%rowtype;
  v_first date;
  v_last date;
begin
  v_admin_id := public.require_admin();
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if v_booking.id is null then raise exception 'BOOKING_NOT_FOUND'; end if;
  if v_booking.status <> 'confirmed' then raise exception 'BOOKING_NOT_ACTIVE'; end if;
  select * into strict v_learner from public.learners where id = v_booking.learner_id;

  if not p_override_business_rules
    and v_learner.school_weekday is not null
    and exists (
      select 1 from unnest(p_dates) day_value
      where extract(isodow from day_value)::smallint = v_learner.school_weekday
    ) then
    raise exception 'SCHOOL_DAY_NOT_ALLOWED';
  end if;

  perform public.assert_physical_booking_rules(
    v_booking.learner_id,
    p_box_id,
    p_dates,
    v_booking.course_duration_snapshot,
    p_booking_id
  );
  select min(day_value), max(day_value) into v_first, v_last from unnest(p_dates) day_value;

  update public.booking_days set is_active = false
  where booking_id = p_booking_id and is_active;

  update public.bookings
  set box_id = p_box_id,
      first_booking_date = v_first,
      last_booking_date = v_last,
      business_rules_overridden = business_rules_overridden or p_override_business_rules
  where id = p_booking_id;

  insert into public.booking_days (booking_id, learner_id, box_id, booking_date)
  select p_booking_id, v_booking.learner_id, p_box_id, day_value
  from unnest(p_dates) day_value;

  return jsonb_build_object(
    'booking_id', p_booking_id,
    'box_id', p_box_id,
    'dates', to_jsonb(p_dates),
    'moved_by', v_admin_id
  );
exception
  when unique_violation then raise exception 'BOOKING_CONFLICT';
end;
$$;

create or replace function public.admin_cancel_booking(
  p_booking_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_admin_id uuid;
begin
  v_admin_id := public.require_admin();
  return public.cancel_booking_internal(p_booking_id, 'admin', v_admin_id, p_reason);
end;
$$;

create or replace function public.admin_reset_all_credits()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_admin_id uuid;
  v_reset_id uuid;
  v_learner public.learners%rowtype;
  v_count integer := 0;
begin
  v_admin_id := public.require_admin();
  insert into public.credit_reset_runs (executed_by_admin_id)
  values (v_admin_id)
  returning id into v_reset_id;

  for v_learner in
    select * from public.learners where active order by id for update
  loop
    update public.learners set credit_balance = 5 where id = v_learner.id;
    insert into public.credit_transactions (
      learner_id, reset_run_id, transaction_type, delta,
      balance_before, balance_after, note, created_by_admin_id
    ) values (
      v_learner.id, v_reset_id, 'global_reset', 5 - v_learner.credit_balance,
      v_learner.credit_balance, 5, 'Jährlicher globaler Credit-Reset', v_admin_id
    );
    v_count := v_count + 1;
  end loop;

  update public.credit_reset_runs set learner_count = v_count where id = v_reset_id;
  return jsonb_build_object('reset_run_id', v_reset_id, 'learner_count', v_count, 'new_balance', 5);
end;
$$;

create or replace function public.admin_adjust_learner_credits(
  p_learner_id uuid,
  p_new_balance smallint,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_admin_id uuid;
  v_learner public.learners%rowtype;
begin
  v_admin_id := public.require_admin();
  if p_new_balance not between 0 and 5 then raise exception 'INVALID_CREDIT_BALANCE'; end if;
  if nullif(trim(p_note), '') is null then raise exception 'ADJUSTMENT_NOTE_REQUIRED'; end if;
  select * into v_learner from public.learners where id = p_learner_id for update;
  if v_learner.id is null then raise exception 'LEARNER_NOT_FOUND'; end if;

  update public.learners set credit_balance = p_new_balance where id = p_learner_id;
  insert into public.credit_transactions (
    learner_id, transaction_type, delta, balance_before, balance_after, note, created_by_admin_id
  ) values (
    p_learner_id, 'admin_adjustment', p_new_balance - v_learner.credit_balance,
    v_learner.credit_balance, p_new_balance, trim(p_note), v_admin_id
  );
  return jsonb_build_object('learner_id', p_learner_id, 'credit_balance', p_new_balance);
end;
$$;

create or replace view public.admin_credit_overview
with (security_invoker = true)
as
select
  l.id,
  l.first_name,
  l.last_name,
  l.profession,
  l.apprenticeship_year,
  5 - l.credit_balance as used_credits,
  l.credit_balance as available_credits,
  case
    when l.credit_balance = 5 then 'not_used'
    when l.credit_balance = 0 then 'fully_used'
    else 'partially_used'
  end as credit_status,
  l.active
from public.learners l;

create or replace view public.admin_week_schedule
with (security_invoker = true)
as
select
  bd.booking_date,
  bd.box_id,
  bx.name as box_name,
  b.id as booking_id,
  b.status,
  b.course_title_snapshot,
  l.id as learner_id,
  l.first_name,
  l.last_name
from public.booking_days bd
join public.bookings b on b.id = bd.booking_id
join public.boxes bx on bx.id = bd.box_id
join public.learners l on l.id = bd.learner_id
where bd.is_active;

alter table public.app_admin enable row level security;
alter table public.learners enable row level security;
alter table public.courses enable row level security;
alter table public.boxes enable row level security;
alter table public.box_blocks enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_days enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.credit_reset_runs enable row level security;
alter table public.learner_sessions enable row level security;
alter table public.learner_auth_attempts enable row level security;

create policy app_admin_admin_all on public.app_admin
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy learners_admin_all on public.learners
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy courses_admin_all on public.courses
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy boxes_admin_all on public.boxes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy box_blocks_admin_all on public.box_blocks
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy bookings_admin_all on public.bookings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy booking_days_admin_all on public.booking_days
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy credit_transactions_admin_select on public.credit_transactions
  for select to authenticated using (public.is_admin());
create policy credit_reset_runs_admin_select on public.credit_reset_runs
  for select to authenticated using (public.is_admin());
create policy learner_sessions_admin_select on public.learner_sessions
  for select to authenticated using (public.is_admin());
create policy learner_auth_attempts_admin_select on public.learner_auth_attempts
  for select to authenticated using (public.is_admin());

revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;

grant select, insert, update, delete on public.app_admin to authenticated;
grant select, insert, update on public.learners to authenticated;
grant select, insert, update on public.courses to authenticated;
grant select, insert, update on public.boxes to authenticated;
grant select, insert, update, delete on public.box_blocks to authenticated;
grant select on public.bookings, public.booking_days to authenticated;
grant select on public.credit_transactions, public.credit_reset_runs to authenticated;
grant select on public.learner_sessions, public.learner_auth_attempts to authenticated;
grant select on public.admin_credit_overview, public.admin_week_schedule to authenticated;
grant usage, select on sequence public.learner_auth_attempts_id_seq to authenticated;

revoke all on function public.require_admin() from public, anon, authenticated;
revoke all on function public.validate_learner_session(text, boolean) from public, anon, authenticated;
revoke all on function public.lock_booking_resources(uuid, uuid, date[]) from public, anon, authenticated;
revoke all on function public.assert_physical_booking_rules(uuid, uuid, date[], smallint, uuid) from public, anon, authenticated;
revoke all on function public.cancel_booking_internal(uuid, public.actor_type, uuid, text) from public, anon, authenticated;

revoke all on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;

revoke all on function public.create_learner_session(text, date) from public, anon, authenticated;
grant execute on function public.create_learner_session(text, date) to anon, authenticated;
revoke all on function public.revoke_learner_session(text) from public, anon, authenticated;
grant execute on function public.revoke_learner_session(text) to anon, authenticated;
revoke all on function public.set_learner_school_day(text, smallint) from public, anon, authenticated;
grant execute on function public.set_learner_school_day(text, smallint) to anon, authenticated;
revoke all on function public.get_learner_portal_data(text) from public, anon, authenticated;
grant execute on function public.get_learner_portal_data(text) to anon, authenticated;
revoke all on function public.get_course_box_availability(text, uuid, date, boolean) from public, anon, authenticated;
grant execute on function public.get_course_box_availability(text, uuid, date, boolean) to anon, authenticated;
revoke all on function public.create_learner_booking(text, uuid, uuid, date[], boolean) from public, anon, authenticated;
grant execute on function public.create_learner_booking(text, uuid, uuid, date[], boolean) to anon, authenticated;
revoke all on function public.cancel_learner_booking(text, uuid) from public, anon, authenticated;
grant execute on function public.cancel_learner_booking(text, uuid) to anon, authenticated;

revoke all on function public.admin_create_booking(uuid, uuid, uuid, date[], boolean) from public, anon, authenticated;
grant execute on function public.admin_create_booking(uuid, uuid, uuid, date[], boolean) to authenticated;
revoke all on function public.admin_move_booking(uuid, uuid, date[], boolean) from public, anon, authenticated;
grant execute on function public.admin_move_booking(uuid, uuid, date[], boolean) to authenticated;
revoke all on function public.admin_cancel_booking(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_cancel_booking(uuid, text) to authenticated;
revoke all on function public.admin_reset_all_credits() from public, anon, authenticated;
grant execute on function public.admin_reset_all_credits() to authenticated;
revoke all on function public.admin_adjust_learner_credits(uuid, smallint, text) from public, anon, authenticated;
grant execute on function public.admin_adjust_learner_credits(uuid, smallint, text) to authenticated;

comment on table public.app_admin is 'Singleton-Tabelle: enthält exakt den einzigen MasterMag-Administrator.';
comment on table public.booking_days is 'Jeder nicht zwingend aufeinanderfolgende Kurstag wird einzeln gespeichert.';
comment on table public.credit_transactions is 'Unveränderbare Historie sämtlicher Credit-Veränderungen.';
comment on table public.learner_sessions is 'Kurzlebige Lernenden-Sitzungen; nur SHA-256-Hashes der Tokens werden gespeichert.';
comment on function public.create_learner_booking(text, uuid, uuid, date[], boolean)
  is 'Prüft und erstellt eine Lernenden-Buchung samt Credit-Abzug atomar.';
comment on function public.admin_reset_all_credits()
  is 'Setzt alle aktiven Lernenden in einer Transaktion exakt auf fünf Credits.';

commit;

-- EINRICHTUNG DES EINZIGEN ADMINISTRATORS
-- 1. In Supabase Authentication genau einen Benutzer manuell erstellen.
-- 2. Dessen UUID kopieren und den folgenden Befehl separat ausführen:
--
-- insert into public.app_admin (singleton_id, user_id)
-- values (1, 'HIER-DIE-AUTH-USER-UUID-EINTRAGEN');
--
-- Der Primary Key mit CHECK (singleton_id = 1) verhindert einen zweiten Administrator.
