import { getSupabase } from '../lib/supabaseClient.js';
import { unwrap, normalizeSearch } from './apiClient.js';

export async function listBookings({ search = '', status = '', from = '', to = '' } = {}) {
  let query = getSupabase()
    .from('bookings')
    .select(
      '*,learners(id,first_name,last_name,email),boxes(id,name),booking_days(id,booking_date,is_active)',
    )
    .order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  if (from) query = query.gte('first_booking_date', from);
  if (to) query = query.lte('last_booking_date', to);
  const data = unwrap(await query);
  const term = normalizeSearch(search).toLocaleLowerCase('de-CH');
  if (!term) return data;
  return data.filter((booking) =>
    `${booking.learners?.first_name} ${booking.learners?.last_name} ${booking.course_title_snapshot} ${booking.boxes?.name}`
      .toLocaleLowerCase('de-CH')
      .includes(term),
  );
}

export async function adminCreateBooking(values) {
  return unwrap(
    await getSupabase().rpc('admin_create_booking', {
      p_learner_id: values.learner_id,
      p_course_id: values.course_id,
      p_box_id: values.box_id,
      p_dates: values.dates,
      p_override_business_rules: Boolean(values.override_business_rules),
    }),
  );
}

export async function adminMoveBooking(values) {
  return unwrap(
    await getSupabase().rpc('admin_move_booking', {
      p_booking_id: values.booking_id,
      p_box_id: values.box_id,
      p_dates: values.dates,
      p_override_business_rules: Boolean(values.override_business_rules),
    }),
  );
}

export async function adminCancelBooking(bookingId, reason) {
  return unwrap(
    await getSupabase().rpc('admin_cancel_booking', {
      p_booking_id: bookingId,
      p_reason: reason || null,
    }),
  );
}
