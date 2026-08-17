import { CANCELLATION_NOTICE_DAYS, MAX_BOOKING_WINDOW_DAYS } from '../constants/businessRules.js';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseIsoDate(value) {
  if (!ISO_DATE_PATTERN.test(value ?? '')) throw new Error('Ungültiges ISO-Datum.');
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function toIsoDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayIso() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Zurich',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function addDays(isoDate, amount) {
  const date = parseIsoDate(isoDate);
  date.setUTCDate(date.getUTCDate() + amount);
  return toIsoDate(date);
}

export function daysBetween(first, last) {
  return Math.round((parseIsoDate(last) - parseIsoDate(first)) / 86_400_000);
}

export function isWeekday(isoDate) {
  const weekday = parseIsoDate(isoDate).getUTCDay();
  return weekday >= 1 && weekday <= 5;
}

export function isoWeekday(isoDate) {
  const weekday = parseIsoDate(isoDate).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

export function isWithinBookingWindow(dates) {
  if (!dates.length) return false;
  const sorted = [...dates].sort();
  return daysBetween(sorted[0], sorted.at(-1)) <= MAX_BOOKING_WINDOW_DAYS - 1;
}

export function canLearnerCancel(firstBookingDate, currentDate = todayIso()) {
  return daysBetween(currentDate, firstBookingDate) >= CANCELLATION_NOTICE_DAYS;
}

export function startOfIsoWeek(isoDate = todayIso()) {
  return addDays(isoDate, 1 - isoWeekday(isoDate));
}

export function weekDates(monday) {
  return Array.from({ length: 5 }, (_, index) => addDays(monday, index));
}

export function formatDate(isoDate, options = {}) {
  if (!isoDate) return '–';
  const { short = false, ...intlOptions } = options;
  return new Intl.DateTimeFormat('de-CH', {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
    year: short ? undefined : 'numeric',
    ...intlOptions,
  }).format(parseIsoDate(isoDate));
}

export function formatWeekday(isoDate, format = 'long') {
  return new Intl.DateTimeFormat('de-CH', { timeZone: 'UTC', weekday: format }).format(
    parseIsoDate(isoDate),
  );
}

export function formatDateTime(value) {
  if (!value) return '–';
  return new Intl.DateTimeFormat('de-CH', {
    timeZone: 'Europe/Zurich',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function isoWeekNumber(isoDate) {
  const date = parseIsoDate(isoDate);
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date - yearStart) / 86_400_000 + 1) / 7);
}
