import { describe, expect, it } from 'vitest';
import {
  debitCredits,
  isSelectableCourseDate,
  isValidCourseDateSelection,
  refundCredits,
  resetCredits,
} from '../src/utils/bookingRules.js';
import { isCourseDuration } from '../src/utils/validation.js';

describe('Kurstage und Schultag', () => {
  it('akzeptiert als Kursdauer ausschliesslich 1 bis 5 ganze Tage', () => {
    expect([1, 2, 3, 4, 5].every(isCourseDuration)).toBe(true);
    expect(isCourseDuration(0)).toBe(false);
    expect(isCourseDuration(6)).toBe(false);
    expect(isCourseDuration(2.5)).toBe(false);
  });

  it('verlangt exakt die Kursdauer', () => {
    expect(isValidCourseDateSelection(['2026-08-18', '2026-08-20'], 3)).toBe(false);
    expect(isValidCourseDateSelection(['2026-08-18', '2026-08-20', '2026-08-21'], 3)).toBe(true);
  });

  it('schliesst den gespeicherten Schultag aus', () => {
    expect(isSelectableCourseDate('2026-08-19', 3, false)).toBe(false);
  });

  it('erlaubt den Schultag im Schulferien-Modus', () => {
    expect(isSelectableCourseDate('2026-08-19', 3, true)).toBe(true);
  });
});

describe('Credits', () => {
  it('reduziert 5 bei einem Dreitageskurs auf 2', () => {
    expect(debitCredits(5, 3)).toBe(2);
  });

  it('lehnt eine Buchung mit zu wenigen Credits ab', () => {
    expect(() => debitCredits(2, 3)).toThrow('INSUFFICIENT_CREDITS');
  });

  it('begrenzt Rückerstattungen auf 5', () => {
    expect(refundCredits(4, 3)).toBe(5);
  });

  it.each([0, 2, 5])('setzt %i beim Reset exakt auf 5', (balance) => {
    expect(resetCredits(balance)).toBe(5);
  });
});
