-- Keep learner portal sessions active until explicit logout or learner deactivation.
-- Run this migration once in the Supabase SQL editor for existing installations.

update public.learner_sessions
set expires_at = 'infinity'::timestamptz
where revoked_at is null;

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
  v_expires_at timestamptz := 'infinity'::timestamptz;
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

revoke all on function public.create_learner_session(text, date)
from public, anon, authenticated;

grant execute on function public.create_learner_session(text, date)
to anon, authenticated;
