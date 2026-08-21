import { getSupabase } from '../lib/supabaseClient.js';
import { unwrap } from './apiClient.js';

const fields = 'id,name,gl_first_name,gl_last_name,gl_email,gl_phone,created_at,updated_at';

export async function listBusinessOffices() {
  return unwrap(await getSupabase().from('business_offices').select(fields).order('name'));
}

export async function listPublicBusinessOffices() {
  return unwrap(await getSupabase().rpc('list_active_business_offices'));
}

export async function saveBusinessOffice(values, id) {
  const payload = {
    name: values.name.trim(),
    gl_first_name: values.gl_first_name.trim(),
    gl_last_name: values.gl_last_name.trim(),
    gl_email: values.gl_email.trim().toLowerCase(),
    gl_phone: `+41${values.gl_phone.replace(/\D/g, '').replace(/^41/, '')}`,
  };
  const query = id
    ? getSupabase().from('business_offices').update(payload).eq('id', id)
    : getSupabase().from('business_offices').insert(payload);
  return unwrap(await query.select(fields).single());
}

export async function deleteBusinessOffice(id) {
  return unwrap(await getSupabase().from('business_offices').delete().eq('id', id));
}
