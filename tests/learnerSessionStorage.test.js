import { beforeEach, describe, expect, it } from 'vitest';
import { LEARNER_SESSION_KEY } from '../src/constants/businessRules.js';
import { clearLearnerSession, getLearnerToken } from '../src/auth/learnerSession.js';

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
  };
}

describe('Dauerhafte Lernenden-Anmeldung', () => {
  beforeEach(() => {
    globalThis.localStorage = createStorage();
    globalThis.sessionStorage = createStorage();
  });

  it('liest den Sitzungsschlüssel aus dem dauerhaften Browser-Speicher', () => {
    localStorage.setItem(LEARNER_SESSION_KEY, 'persisted-token');

    expect(getLearnerToken()).toBe('persisted-token');
  });

  it('migriert bestehende Tab-Sitzungen in den dauerhaften Speicher', () => {
    sessionStorage.setItem(LEARNER_SESSION_KEY, 'legacy-token');

    expect(getLearnerToken()).toBe('legacy-token');
    expect(localStorage.getItem(LEARNER_SESSION_KEY)).toBe('legacy-token');
    expect(sessionStorage.getItem(LEARNER_SESSION_KEY)).toBeNull();
  });

  it('entfernt die Sitzung erst beim bewussten Abmelden', () => {
    localStorage.setItem(LEARNER_SESSION_KEY, 'persisted-token');
    sessionStorage.setItem(LEARNER_SESSION_KEY, 'legacy-token');

    clearLearnerSession();

    expect(localStorage.getItem(LEARNER_SESSION_KEY)).toBeNull();
    expect(sessionStorage.getItem(LEARNER_SESSION_KEY)).toBeNull();
  });
});
