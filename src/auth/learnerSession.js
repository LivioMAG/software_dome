import { LEARNER_SESSION_KEY } from '../constants/businessRules.js';
import { store } from '../app/store.js';
import {
  createLearnerSession,
  getLearnerPortalData,
  revokeLearnerSession,
} from '../api/learnerApi.js';
import { AppError } from '../utils/errors.js';

export function getLearnerToken() {
  const persistedToken = localStorage.getItem(LEARNER_SESSION_KEY);
  if (persistedToken) return persistedToken;

  // Preserve sessions created by versions that stored the token only for the
  // current browser tab, then migrate them to durable browser storage.
  const legacyToken = sessionStorage.getItem(LEARNER_SESSION_KEY);
  if (legacyToken) {
    localStorage.setItem(LEARNER_SESSION_KEY, legacyToken);
    sessionStorage.removeItem(LEARNER_SESSION_KEY);
  }
  return legacyToken;
}

export async function signInLearner(email, birthDate) {
  const response = await createLearnerSession(email, birthDate);
  const result = Array.isArray(response) ? response[0] : response;
  if (!result?.ok || !result.session_token) {
    const rateLimited = result?.error_code === 'RATE_LIMITED';
    throw new AppError(
      rateLimited
        ? 'Zu viele Versuche. Bitte warte einige Minuten und versuche es erneut.'
        : 'Die Angaben konnten nicht bestätigt werden.',
      result?.error_code ?? 'INVALID_LEARNER_CREDENTIALS',
    );
  }
  localStorage.setItem(LEARNER_SESSION_KEY, result.session_token);
  sessionStorage.removeItem(LEARNER_SESSION_KEY);
  const portal = await loadLearnerPortal();
  return portal;
}

export async function loadLearnerPortal({ force = false } = {}) {
  const token = getLearnerToken();
  if (!token) return null;
  if (!force && store.get().learnerPortal) return store.get().learnerPortal;
  try {
    const portal = await getLearnerPortalData(token);
    store.set({ learner: portal.learner, learnerPortal: portal });
    return portal;
  } catch (error) {
    clearLearnerSession();
    throw error;
  }
}

export function clearLearnerSession() {
  localStorage.removeItem(LEARNER_SESSION_KEY);
  sessionStorage.removeItem(LEARNER_SESSION_KEY);
  store.set({ learner: null, learnerPortal: null });
  store.resetBooking();
}

export async function signOutLearner() {
  const token = getLearnerToken();
  if (token) await revokeLearnerSession(token).catch(() => null);
  clearLearnerSession();
}

export async function learnerGuard() {
  try {
    const portal = await loadLearnerPortal();
    return portal ? null : '/learner/login';
  } catch {
    return '/learner/login';
  }
}

export async function learnerSchoolDayGuard() {
  const redirect = await learnerGuard();
  if (redirect) return redirect;
  return store.get().learner?.school_weekday ? null : '/learner/school-day';
}
