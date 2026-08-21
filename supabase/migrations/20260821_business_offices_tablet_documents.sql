-- Business offices, booking remarks/approval, course documents and protected box tablets.
create table if not exists public.business_offices (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(trim(name)) between 1 and 160),
  gl_first_name text not null check (char_length(trim(gl_first_name)) between 1 and 100),
  gl_last_name text not null check (char_length(trim(gl_last_name)) between 1 and 100),
  gl_email extensions.citext not null,
  gl_phone text not null check (gl_phone ~ '^\+41[0-9 ]{7,15}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.learners add column if not exists business_office_id uuid
  references public.business_offices(id) on delete set null;
alter table public.courses add column if not exists remark_required boolean not null default false;
alter table public.bookings add column if not exists remark text;
alter table public.bookings add column if not exists approval_status text not null default 'pending'
  check (approval_status in ('pending', 'approved', 'rejected'));
alter table public.bookings add column if not exists approval_token uuid not null default gen_random_uuid();
alter table public.bookings add column if not exists approved_at timestamptz;

create table if not exists public.course_documents (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  file_name text not null,
  storage_path text not null unique,
  mime_type text,
  created_at timestamptz not null default now()
);
create table if not exists public.booking_documents (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  booking_day_id uuid references public.booking_days(id) on delete cascade,
  file_name text not null,
  storage_path text not null unique,
  mime_type text,
  created_at timestamptz not null default now()
);
create table if not exists public.tablet_access (
  singleton_id smallint primary key default 1 check (singleton_id = 1),
  code_hash text not null,
  updated_at timestamptz not null default now()
);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('course-documents','course-documents',true,20971520,array['application/pdf','image/png','image/jpeg'])
on conflict(id) do nothing;
create policy course_document_files_admin_insert on storage.objects for insert to authenticated
  with check(bucket_id='course-documents' and public.is_admin());
create policy course_document_files_admin_delete on storage.objects for delete to authenticated
  using(bucket_id='course-documents' and public.is_admin());
create policy course_document_files_public_read on storage.objects for select to anon,authenticated
  using(bucket_id='course-documents');
create table if not exists public.tablet_sessions (
  token_hash text primary key,
  box_id uuid not null references public.boxes(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create or replace function public.enforce_learner_advance_notice()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
declare v_actor public.actor_type;
begin
  select created_by_type into v_actor from public.bookings where id = new.booking_id;
  if v_actor = 'learner' and new.booking_date < public.app_today() + 14 then
    raise exception 'DATE_TOO_SOON';
  end if;
  return new;
end; $$;
drop trigger if exists booking_days_learner_advance_notice on public.booking_days;
create trigger booking_days_learner_advance_notice before insert or update on public.booking_days
for each row execute function public.enforce_learner_advance_notice();

create or replace function public.list_active_business_offices()
returns table(id uuid, name text) language sql security definer
set search_path = pg_catalog, public stable as $$
  select id, name from public.business_offices order by name
$$;
create or replace function public.set_learner_business_office(p_session_token text, p_office_id uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_learner uuid;
begin
  v_learner := public.validate_learner_session(p_session_token);
  if not exists(select 1 from public.business_offices where id = p_office_id) then
    raise exception 'OFFICE_NOT_FOUND';
  end if;
  update public.learners set business_office_id = p_office_id where id = v_learner;
  return jsonb_build_object('business_office_id', p_office_id);
end; $$;
create or replace function public.get_learner_business_office(p_session_token text)
returns jsonb language sql security definer set search_path = pg_catalog, public stable as $$
  select jsonb_build_object('business_office_id', l.business_office_id, 'business_office_name', o.name,
    'gl_name', o.gl_first_name||' '||o.gl_last_name, 'gl_email', o.gl_email)
  from public.learners l left join public.business_offices o on o.id=l.business_office_id
  where l.id=public.validate_learner_session(p_session_token)
$$;
create or replace function public.get_learner_course_requirements(p_session_token text)
returns jsonb language sql security definer set search_path = pg_catalog, public stable as $$
  select coalesce(jsonb_object_agg(c.id, c.remark_required), '{}'::jsonb)
  from public.courses c where public.validate_learner_session(p_session_token) is not null and c.active
$$;

-- Keeps the original atomic booking implementation and adds the remark contract.
create or replace function public.create_learner_booking_with_remark(
  p_session_token text, p_course_id uuid, p_box_id uuid, p_dates date[],
  p_school_holiday_mode boolean default false, p_remark text default null
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_required boolean; v_result jsonb; v_booking uuid;
begin
  select remark_required into v_required from public.courses where id = p_course_id;
  if coalesce(v_required, false) and nullif(trim(coalesce(p_remark, '')), '') is null then
    raise exception 'REMARK_REQUIRED';
  end if;
  v_result := public.create_learner_booking(p_session_token, p_course_id, p_box_id, p_dates, p_school_holiday_mode);
  v_booking := (v_result->>'booking_id')::uuid;
  update public.bookings set remark = nullif(trim(coalesce(p_remark, '')), '') where id = v_booking;
  return v_result || jsonb_build_object('approval_token', (select approval_token from public.bookings where id=v_booking));
end; $$;

create or replace function public.approve_booking(p_token uuid, p_approved boolean)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_id uuid;
begin
  update public.bookings set approval_status = case when p_approved then 'approved' else 'rejected' end,
    approved_at = case when p_approved then now() else null end
  where approval_token = p_token and status = 'confirmed' returning id into v_id;
  if v_id is null then raise exception 'APPROVAL_NOT_FOUND'; end if;
  return jsonb_build_object('booking_id', v_id, 'approved', p_approved);
end; $$;

create or replace function public.admin_set_tablet_code(p_code text)
returns text language plpgsql security definer set search_path = pg_catalog, public, extensions as $$
declare v_code text := coalesce(nullif(trim(p_code), ''), lpad((floor(random()*1000000))::int::text, 6, '0'));
begin
  perform public.require_admin();
  if v_code !~ '^[0-9]{6}$' then raise exception 'TABLET_CODE_FORMAT'; end if;
  insert into public.tablet_access(singleton_id, code_hash) values(1, encode(digest(v_code, 'sha256'),'hex'))
  on conflict(singleton_id) do update set code_hash=excluded.code_hash, updated_at=now();
  delete from public.tablet_sessions;
  return v_code;
end; $$;
create or replace function public.connect_box_tablet(p_code text, p_box_id uuid)
returns text language plpgsql security definer set search_path = pg_catalog, public, extensions as $$
declare v_token text := encode(gen_random_bytes(32), 'hex');
begin
  if not exists(select 1 from public.tablet_access where singleton_id=1 and code_hash=encode(digest(p_code,'sha256'),'hex'))
     or not exists(select 1 from public.boxes where id=p_box_id and active) then raise exception 'TABLET_ACCESS_DENIED'; end if;
  insert into public.tablet_sessions(token_hash, box_id, expires_at)
  values(encode(digest(v_token,'sha256'),'hex'), p_box_id, now()+interval '30 days');
  return v_token;
end; $$;
create or replace function public.list_tablet_boxes()
returns table(id uuid, name text) language sql security definer set search_path=pg_catalog,public stable as $$
  select id,name from public.boxes where active order by display_order,name
$$;
create or replace function public.get_box_tablet_day(p_token text, p_date date default public.app_today())
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, extensions as $$
declare v_box uuid; v_result jsonb;
begin
  select box_id into v_box from public.tablet_sessions
   where token_hash=encode(digest(p_token,'sha256'),'hex') and expires_at>now();
  if v_box is null then raise exception 'TABLET_SESSION_INVALID'; end if;
  select jsonb_build_object('box_id', bx.id, 'box_name', bx.name, 'date', p_date,
    'bookings', coalesce(jsonb_agg(jsonb_build_object('booking_id',b.id,'learner_name',l.first_name||' '||l.last_name,
      'course_title',b.course_title_snapshot,'remark',b.remark,
      'documents',coalesce((select jsonb_agg(jsonb_build_object('name',d.file_name,'path',d.storage_path))
        from public.course_documents d where d.course_id=b.course_id),'[]'::jsonb))) filter(where b.id is not null),'[]'::jsonb))
  into v_result from public.boxes bx left join public.booking_days bd on bd.box_id=bx.id and bd.booking_date=p_date and bd.is_active
  left join public.bookings b on b.id=bd.booking_id left join public.learners l on l.id=b.learner_id where bx.id=v_box group by bx.id;
  return v_result;
end; $$;

alter table public.business_offices enable row level security;
alter table public.course_documents enable row level security;
alter table public.booking_documents enable row level security;
alter table public.tablet_access enable row level security;
alter table public.tablet_sessions enable row level security;
create policy business_offices_admin_all on public.business_offices for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy course_documents_admin_all on public.course_documents for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy booking_documents_admin_all on public.booking_documents for all to authenticated using(public.is_admin()) with check(public.is_admin());
grant select,insert,update,delete on public.business_offices, public.course_documents, public.booking_documents to authenticated;
grant execute on function public.list_active_business_offices() to anon, authenticated;
grant execute on function public.set_learner_business_office(text,uuid) to anon, authenticated;
grant execute on function public.get_learner_business_office(text) to anon, authenticated;
grant execute on function public.get_learner_course_requirements(text) to anon, authenticated;
grant execute on function public.create_learner_booking_with_remark(text,uuid,uuid,date[],boolean,text) to anon, authenticated;
grant execute on function public.approve_booking(uuid,boolean) to anon, authenticated;
grant execute on function public.admin_set_tablet_code(text) to authenticated;
grant execute on function public.connect_box_tablet(text,uuid) to anon, authenticated;
grant execute on function public.list_tablet_boxes() to anon, authenticated;
grant execute on function public.get_box_tablet_day(text,date) to anon, authenticated;
