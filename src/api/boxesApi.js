import { getSupabase } from '../lib/supabaseClient.js';
import { unwrap } from './apiClient.js';

const fields = 'id,name,description,display_order,active,created_at,updated_at';

export async function listBoxes({ active } = {}) {
  let query = getSupabase().from('boxes').select(fields).order('display_order').order('name');
  if (active !== undefined && active !== '')
    query = query.eq('active', active === true || active === 'true');
  return unwrap(await query);
}

export async function saveBox(values, id) {
  const payload = {
    name: values.name.trim(),
    description: values.description?.trim() || null,
    display_order: Number(values.display_order ?? 0),
    active: values.active !== false,
  };
  const query = id
    ? getSupabase().from('boxes').update(payload).eq('id', id)
    : getSupabase().from('boxes').insert(payload);
  return unwrap(await query.select(fields).single());
}

export async function setBoxActive(id, active) {
  return unwrap(
    await getSupabase().from('boxes').update({ active }).eq('id', id).select(fields).single(),
  );
}
