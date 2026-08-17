export const MAX_CREDITS = 5;
export const MAX_BOOKING_WINDOW_DAYS = 7;
export const CANCELLATION_NOTICE_DAYS = 14;
export const LEARNER_SESSION_KEY = 'mastermag_learner_session';

export const PROFESSIONS = Object.freeze({
  elektroinstallateur: 'Elektroinstallateur/in',
  montageelektriker: 'Montage-Elektriker/in',
});

export const PROFESSION_SCOPES = Object.freeze({
  elektroinstallateur: 'Elektroinstallateur/in',
  montageelektriker: 'Montage-Elektriker/in',
  both: 'Beide Ausbildungen',
});

export const SCHOOL_DAYS = Object.freeze([
  { value: 1, label: 'Montag' },
  { value: 2, label: 'Dienstag' },
  { value: 3, label: 'Mittwoch' },
  { value: 4, label: 'Donnerstag' },
  { value: 5, label: 'Freitag' },
]);

export const BOOKING_STATUSES = Object.freeze({
  confirmed: 'Bestätigt',
  cancelled: 'Storniert',
});

export const BLOCK_TYPES = Object.freeze({
  holiday: 'Feiertag',
  internal: 'Interner Gebrauch',
  maintenance: 'Wartung',
  setup: 'Aufbau',
  repair: 'Reparatur',
  other: 'Sonstige Sperrung',
});
