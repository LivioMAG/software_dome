import { todayIso } from './dates.js';

export const TABLET_DATE_KEY = 'mastermag_tablet_simulated_date';

export function getTabletDate(storage = localStorage, actualDate = todayIso()) {
  return storage.getItem(TABLET_DATE_KEY) || actualDate;
}

export function setTabletDate(date, storage = localStorage, actualDate = todayIso()) {
  if (date === actualDate) storage.removeItem(TABLET_DATE_KEY);
  else storage.setItem(TABLET_DATE_KEY, date);
}

export function clearTabletDate(storage = localStorage) {
  storage.removeItem(TABLET_DATE_KEY);
}
