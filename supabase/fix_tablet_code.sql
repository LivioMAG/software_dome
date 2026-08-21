-- Diese Datei einmal vollständig im Supabase SQL Editor ausführen.
-- Sie behebt "DELETE requires a WHERE clause" beim Erstellen eines Tablet-Codes.
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

  -- token_hash is a primary key and therefore always non-null. The predicate keeps
  -- the intentional full reset compatible with databases that enforce safe updates.
  delete from public.tablet_sessions where token_hash is not null;
  return v_code;
end; $$;

grant execute on function public.admin_set_tablet_code(text) to authenticated;
