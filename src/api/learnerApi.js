import { getSupabase } from '../lib/supabaseClient.js';
import { unwrap } from './apiClient.js';

export const createLearnerSession = async (email, birthDate) =>
  unwrap(
    await getSupabase().rpc('create_learner_session', {
      p_email: email.trim().toLowerCase(),
      p_birth_date: birthDate,
    }),
  );

export const getLearnerPortalData = async (token) =>
  unwrap(await getSupabase().rpc('get_learner_portal_data', { p_session_token: token }));

export const getLearnerBusinessOffice = async (token) =>
  unwrap(await getSupabase().rpc('get_learner_business_office', { p_session_token: token }));

export const getLearnerCourseRequirements = async (token) =>
  unwrap(await getSupabase().rpc('get_learner_course_requirements', { p_session_token: token }));

export const setLearnerBusinessOffice = async (token, officeId) =>
  unwrap(
    await getSupabase().rpc('set_learner_business_office', {
      p_session_token: token,
      p_office_id: officeId,
    }),
  );

export const setLearnerSchoolDay = async (token, weekday) =>
  unwrap(
    await getSupabase().rpc('set_learner_school_day', {
      p_session_token: token,
      p_school_weekday: Number(weekday),
    }),
  );

export const getCourseBoxAvailability = async (token, courseId, startDate, holidayMode) =>
  unwrap(
    await getSupabase().rpc('get_course_box_availability', {
      p_session_token: token,
      p_course_id: courseId,
      p_start_date: startDate,
      p_school_holiday_mode: Boolean(holidayMode),
    }),
  );

export const createLearnerBooking = async (token, courseId, boxId, dates, holidayMode, remark) =>
  unwrap(
    await getSupabase().rpc('create_learner_booking_with_remark', {
      p_session_token: token,
      p_course_id: courseId,
      p_box_id: boxId,
      p_dates: dates,
      p_school_holiday_mode: Boolean(holidayMode),
      p_remark: remark?.trim() || null,
    }),
  );

export const cancelLearnerBooking = async (token, bookingId) =>
  unwrap(
    await getSupabase().rpc('cancel_learner_booking', {
      p_session_token: token,
      p_booking_id: bookingId,
    }),
  );

export const revokeLearnerSession = async (token) =>
  unwrap(await getSupabase().rpc('revoke_learner_session', { p_session_token: token }));

export const approveBooking = async (token, approved) =>
  unwrap(await getSupabase().rpc('approve_booking', { p_token: token, p_approved: approved }));
