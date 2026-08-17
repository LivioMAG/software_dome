import { getSupabase } from '../lib/supabaseClient.js';
import { unwrap, normalizeSearch } from './apiClient.js';

const fields =
  'id,title,short_description,duration_days,minimum_apprenticeship_year,profession_scope,active,created_at,updated_at';

export async function listCourses({ search = '', active } = {}) {
  let query = getSupabase().from('courses').select(fields).order('title');
  if (active !== undefined && active !== '')
    query = query.eq('active', active === true || active === 'true');
  const term = normalizeSearch(search);
  if (term) query = query.ilike('title', `%${term}%`);
  return unwrap(await query);
}

export async function saveCourse(values, id) {
  const payload = {
    title: values.title.trim(),
    short_description: values.short_description.trim(),
    duration_days: Number(values.duration_days),
    minimum_apprenticeship_year: Number(values.minimum_apprenticeship_year),
    profession_scope: values.profession_scope,
    active: values.active !== false,
  };
  const query = id
    ? getSupabase().from('courses').update(payload).eq('id', id)
    : getSupabase().from('courses').insert(payload);
  return unwrap(await query.select(fields).single());
}

export async function setCourseActive(id, active) {
  return unwrap(
    await getSupabase().from('courses').update({ active }).eq('id', id).select(fields).single(),
  );
}
