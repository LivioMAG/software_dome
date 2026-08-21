-- Keep the active tablet code available to administrators and make code matching robust.
alter table public.tablet_access
  add column if not exists access_code text check (access_code ~ '^[0-9]{6}$');

create or replace function public.admin_set_tablet_code(p_code text)
returns text language plpgsql security definer
set search_path = pg_catalog, public, extensions as $$
declare
  v_code text := coalesce(nullif(trim(p_code), ''), lpad((floor(random() * 1000000))::int::text, 6, '0'));
begin
  perform public.require_admin();
  if v_code !~ '^[0-9]{6}$' then raise exception 'TABLET_CODE_FORMAT'; end if;

  insert into public.tablet_access(singleton_id, code_hash, access_code)
  values (
    1,
    encode(extensions.digest(convert_to(v_code, 'UTF8'), 'sha256'), 'hex'),
    v_code
  )
  on conflict(singleton_id) do update
    set code_hash = excluded.code_hash, access_code = excluded.access_code, updated_at = now();

  delete from public.tablet_sessions;
  return v_code;
end; $$;

create or replace function public.admin_get_tablet_code()
returns text language plpgsql security definer
set search_path = pg_catalog, public stable as $$
begin
  perform public.require_admin();
  return (select access_code from public.tablet_access where singleton_id = 1);
end; $$;

create or replace function public.connect_box_tablet(p_code text, p_box_id uuid)
returns text language plpgsql security definer
set search_path = pg_catalog, public, extensions as $$
declare
  v_code text := trim(coalesce(p_code, ''));
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  if not exists (
    select 1 from public.tablet_access
    where singleton_id = 1
      and code_hash = encode(extensions.digest(convert_to(v_code, 'UTF8'), 'sha256'), 'hex')
  ) or not exists (
    select 1 from public.boxes where id = p_box_id and active
  ) then
    raise exception 'TABLET_ACCESS_DENIED';
  end if;

  insert into public.tablet_sessions(token_hash, box_id, expires_at)
  values (
    encode(extensions.digest(convert_to(v_token, 'UTF8'), 'sha256'), 'hex'),
    p_box_id,
    now() + interval '30 days'
  );
  return v_token;
end; $$;

revoke all on function public.admin_get_tablet_code() from public, anon;
grant execute on function public.admin_get_tablet_code() to authenticated;
grant execute on function public.admin_set_tablet_code(text) to authenticated;
grant execute on function public.connect_box_tablet(text, uuid) to anon, authenticated;
