import {
  BOOKING_STATUSES,
  PROFESSIONS,
  PROFESSION_SCOPES,
  SCHOOL_DAYS,
} from '../constants/businessRules.js';

export const formatProfession = (value) => PROFESSIONS[value] ?? value ?? '–';
export const formatProfessionScope = (value) => PROFESSION_SCOPES[value] ?? value ?? '–';
export const formatSchoolDay = (value) =>
  SCHOOL_DAYS.find((day) => day.value === Number(value))?.label ?? 'Noch nicht festgelegt';
export const formatBookingStatus = (value) => BOOKING_STATUSES[value] ?? value ?? '–';
export const formatCredits = (value) => `${Number(value ?? 0)} von 5`;
export const pluralizeDays = (value) => `${value} ${Number(value) === 1 ? 'Tag' : 'Tage'}`;

export function learnerName(learner) {
  return [learner?.first_name, learner?.last_name].filter(Boolean).join(' ') || 'Unbekannt';
}

export function creditStatus(balance) {
  if (Number(balance) === 5) return { label: 'Noch nicht verwendet', tone: 'neutral' };
  if (Number(balance) === 0) return { label: 'Vollständig verwendet', tone: 'danger' };
  return { label: 'Teilweise verwendet', tone: 'warning' };
}
