import { describe, expect, it } from 'vitest';
import { isWeekday, isWithinBookingWindow } from '../src/utils/dates.js';
import { isValidCourseDateSelection } from '../src/utils/bookingRules.js';

describe('Sieben-Tage-Regel', () => {
  it('erlaubt Montag bis Sonntag', () => {
    expect(isWithinBookingWindow(['2026-08-17', '2026-08-23'])).toBe(true);
  });

  it('verbietet Montag bis Montag der Folgewoche', () => {
    expect(isWithinBookingWindow(['2026-08-17', '2026-08-24'])).toBe(false);
  });

  it('erlaubt nicht aufeinanderfolgende Arbeitstage im Fenster', () => {
    expect(isValidCourseDateSelection(['2026-08-18', '2026-08-20', '2026-08-21'], 3)).toBe(true);
  });
});

describe('Wochenenden', () => {
  it('verbietet Samstag und Sonntag', () => {
    expect(isWeekday('2026-08-22')).toBe(false);
    expect(isWeekday('2026-08-23')).toBe(false);
  });

  it('erlaubt Freitag, Montag und Dienstag in einem Fenster', () => {
    expect(isValidCourseDateSelection(['2026-08-21', '2026-08-24', '2026-08-25'], 3)).toBe(true);
  });
});
