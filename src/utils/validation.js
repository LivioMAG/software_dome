import { MAX_BOOKING_WINDOW_DAYS } from '../constants/businessRules.js';
import { isWeekday, isWithinBookingWindow } from './dates.js';

export const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value?.trim() ?? '');
export const isCourseDuration = (value) =>
  Number.isInteger(Number(value)) && value >= 1 && value <= 5;

export function validateSelectedDates(dates, requiredDays) {
  const uniqueDates = [...new Set(dates)];
  if (uniqueDates.length !== requiredDays) {
    return `Wähle genau ${requiredDays} ${requiredDays === 1 ? 'Kurstag' : 'Kurstage'} aus.`;
  }
  if (uniqueDates.some((date) => !isWeekday(date))) return 'Wochenenden sind nicht buchbar.';
  if (!isWithinBookingWindow(uniqueDates)) {
    return `Alle Kurstage müssen innerhalb von ${MAX_BOOKING_WINDOW_DAYS} Kalendertagen liegen.`;
  }
  return null;
}

export function required(value, label) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return `${label} ist erforderlich.`;
  }
  return null;
}
