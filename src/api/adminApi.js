import { getSupabase } from '../lib/supabaseClient.js';
import { todayIso, addDays, startOfIsoWeek } from '../utils/dates.js';
import { unwrap } from './apiClient.js';

export async function getDashboardData() {
  const today = todayIso();
  const monday = startOfIsoWeek(today);
  const friday = addDays(monday, 4);
  const [learners, courses, boxes, todayDays, weekBookings, resetRuns] = await Promise.all([
    getSupabase()
      .from('learners')
      .select('id,first_name,last_name,profession,apprenticeship_year,credit_balance')
      .eq('active', true),
    getSupabase().from('courses').select('id', { count: 'exact', head: true }).eq('active', true),
    getSupabase().from('boxes').select('id,name', { count: 'exact' }).eq('active', true),
    getSupabase()
      .from('booking_days')
      .select('id,box_id')
      .eq('booking_date', today)
      .eq('is_active', true),
    getSupabase()
      .from('bookings')
      .select('id')
      .eq('status', 'confirmed')
      .gte('first_booking_date', monday)
      .lte('first_booking_date', friday),
    getSupabase()
      .from('credit_reset_runs')
      .select('*')
      .order('executed_at', { ascending: false })
      .limit(1),
  ]);
  const learnerRows = unwrap(learners);
  const boxRows = unwrap(boxes);
  const occupiedToday = unwrap(todayDays).length;
  return {
    learners: learnerRows,
    metrics: {
      activeLearners: learnerRows.length,
      activeCourses: courses.count ?? 0,
      activeBoxes: boxes.count ?? boxRows.length,
      occupiedToday,
      bookingsThisWeek: unwrap(weekBookings).length,
      freeToday: Math.max(0, boxRows.length - occupiedToday),
      fullCredits: learnerRows.filter((learner) => learner.credit_balance === 5).length,
      partialCredits: learnerRows.filter(
        (learner) => learner.credit_balance > 0 && learner.credit_balance < 5,
      ).length,
      noCredits: learnerRows.filter((learner) => learner.credit_balance === 0).length,
    },
    lastReset: unwrap(resetRuns)[0] ?? null,
  };
}

export async function getWeekSchedule(monday) {
  const friday = addDays(monday, 4);
  const [boxes, days, blocks] = await Promise.all([
    getSupabase().from('boxes').select('*').order('display_order').order('name'),
    getSupabase()
      .from('booking_days')
      .select(
        'id,booking_date,box_id,booking_id,bookings!inner(id,status,course_title_snapshot,learners:learners!bookings_learner_id_fkey(first_name,last_name))',
      )
      .eq('is_active', true)
      .gte('booking_date', monday)
      .lte('booking_date', friday),
    getSupabase().from('box_blocks').select('*').lte('start_date', friday).gte('end_date', monday),
  ]);
  return { boxes: unwrap(boxes), days: unwrap(days), blocks: unwrap(blocks) };
}

export async function listBlocks() {
  return unwrap(
    await getSupabase()
      .from('box_blocks')
      .select('*,boxes(name)')
      .order('start_date', { ascending: false }),
  );
}

export async function createBlock(values) {
  return unwrap(
    await getSupabase()
      .from('box_blocks')
      .insert({
        box_id: values.box_id || null,
        start_date: values.start_date,
        end_date: values.end_date,
        title: values.title.trim(),
        reason: values.reason?.trim() || null,
        block_type: values.block_type,
      })
      .select('*,boxes(name)')
      .single(),
  );
}

export async function deleteBlock(id) {
  return unwrap(await getSupabase().from('box_blocks').delete().eq('id', id));
}
