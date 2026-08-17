import { MAX_CREDITS } from '../constants/businessRules.js';
import { isoWeekday, isWeekday, isWithinBookingWindow } from './dates.js';

export function isCourseEligible(course, learner) {
  if (!course?.active || !learner?.active) return false;
  const professionMatches =
    course.profession_scope === 'both' || course.profession_scope === learner.profession;
  return learner.apprenticeship_year >= course.minimum_apprenticeship_year && professionMatches;
}

export function isSelectableCourseDate(date, schoolWeekday, holidayMode = false) {
  if (!isWeekday(date)) return false;
  return holidayMode || !schoolWeekday || isoWeekday(date) !== Number(schoolWeekday);
}

export function isValidCourseDateSelection(dates, durationDays) {
  const unique = [...new Set(dates)];
  return (
    unique.length === Number(durationDays) &&
    unique.every(isWeekday) &&
    isWithinBookingWindow(unique)
  );
}

export function debitCredits(balance, durationDays) {
  const result = Number(balance) - Number(durationDays);
  if (result < 0) throw new Error('INSUFFICIENT_CREDITS');
  return result;
}

export function refundCredits(balance, durationDays) {
  return Math.min(MAX_CREDITS, Number(balance) + Number(durationDays));
}

export function resetCredits() {
  return MAX_CREDITS;
}
