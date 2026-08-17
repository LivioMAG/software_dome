import { describe, expect, it } from 'vitest';
import { canLearnerCancel } from '../src/utils/dates.js';

describe('Stornierungsfrist', () => {
  const currentDate = '2026-08-17';

  it('erlaubt die Stornierung 15 Tage vorher', () => {
    expect(canLearnerCancel('2026-09-01', currentDate)).toBe(true);
  });

  it('erlaubt die Stornierung genau 14 Tage vorher', () => {
    expect(canLearnerCancel('2026-08-31', currentDate)).toBe(true);
  });

  it('verbietet die Stornierung 13 Tage vorher', () => {
    expect(canLearnerCancel('2026-08-30', currentDate)).toBe(false);
  });
});
