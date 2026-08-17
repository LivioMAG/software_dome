import { getSupabase } from '../lib/supabaseClient.js';
import { unwrap, normalizeSearch } from './apiClient.js';

const selectFields =
  'id,first_name,last_name,email,birth_date,apprenticeship_year,profession,school_weekday,credit_balance,active,created_at,updated_at';

export async function listLearners({ search = '', active } = {}) {
  let query = getSupabase()
    .from('learners')
    .select(selectFields)
    .order('last_name')
    .order('first_name');
  if (active !== undefined && active !== '')
    query = query.eq('active', active === true || active === 'true');
  const term = normalizeSearch(search);
  if (term)
    query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%`);
  return unwrap(await query);
}

export async function getLearner(id) {
  return unwrap(await getSupabase().from('learners').select(selectFields).eq('id', id).single());
}

export async function saveLearner(values, id) {
  const payload = {
    first_name: values.first_name.trim(),
    last_name: values.last_name.trim(),
    email: values.email.trim().toLowerCase(),
    birth_date: values.birth_date,
    apprenticeship_year: Number(values.apprenticeship_year),
    profession: values.profession,
    school_weekday: values.school_weekday ? Number(values.school_weekday) : null,
    active: values.active !== false,
  };
  const query = id
    ? getSupabase().from('learners').update(payload).eq('id', id)
    : getSupabase().from('learners').insert(payload);
  return unwrap(await query.select(selectFields).single());
}

export async function setLearnerActive(id, active) {
  return unwrap(
    await getSupabase()
      .from('learners')
      .update({ active })
      .eq('id', id)
      .select(selectFields)
      .single(),
  );
}

export async function getLearnerHistory(id) {
  const [bookings, transactions] = await Promise.all([
    getSupabase()
      .from('bookings')
      .select('*,boxes(name),booking_days(booking_date,is_active)')
      .eq('learner_id', id)
      .order('created_at', { ascending: false }),
    getSupabase()
      .from('credit_transactions')
      .select('*')
      .eq('learner_id', id)
      .order('created_at', { ascending: false }),
  ]);
  return { bookings: unwrap(bookings), transactions: unwrap(transactions) };
}
