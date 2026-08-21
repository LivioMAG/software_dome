import { getSupabase } from '../lib/supabaseClient.js';
import { unwrap, normalizeSearch } from './apiClient.js';

const fields =
  'id,title,short_description,duration_days,minimum_apprenticeship_year,profession_scope,remark_required,active,created_at,updated_at';

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
    remark_required: Boolean(values.remark_required),
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

export async function listCourseDocuments(courseId) {
  return unwrap(
    await getSupabase()
      .from('course_documents')
      .select('*')
      .eq('course_id', courseId)
      .order('file_name'),
  );
}

export async function uploadCourseDocument(courseId, file) {
  const path = `${courseId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  unwrap(await getSupabase().storage.from('course-documents').upload(path, file));
  return unwrap(
    await getSupabase()
      .from('course_documents')
      .insert({
        course_id: courseId,
        file_name: file.name,
        storage_path: path,
        mime_type: file.type,
      })
      .select()
      .single(),
  );
}

export async function deleteCourseDocument(document) {
  unwrap(await getSupabase().storage.from('course-documents').remove([document.storage_path]));
  return unwrap(await getSupabase().from('course_documents').delete().eq('id', document.id));
}
