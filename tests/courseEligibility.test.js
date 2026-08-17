import { describe, expect, it } from 'vitest';
import { isCourseEligible } from '../src/utils/bookingRules.js';

const learner = {
  active: true,
  apprenticeship_year: 3,
  profession: 'elektroinstallateur',
};

const course = {
  active: true,
  minimum_apprenticeship_year: 1,
  profession_scope: 'both',
};

describe('Kursberechtigung', () => {
  it('zeigt einen Kurs ab Lehrjahr 1 in Lehrjahr 1 bis 4', () => {
    for (const year of [1, 2, 3, 4]) {
      expect(isCourseEligible(course, { ...learner, apprenticeship_year: year })).toBe(true);
    }
  });

  it('zeigt einen Kurs ab Lehrjahr 3 nicht in Lehrjahr 2', () => {
    expect(
      isCourseEligible(
        { ...course, minimum_apprenticeship_year: 3 },
        { ...learner, apprenticeship_year: 2 },
      ),
    ).toBe(false);
  });

  it('trennt berufsspezifische Kurse', () => {
    expect(
      isCourseEligible(
        { ...course, profession_scope: 'elektroinstallateur' },
        { ...learner, profession: 'montageelektriker' },
      ),
    ).toBe(false);
  });

  it('erlaubt Kurse für beide Ausbildungen', () => {
    expect(isCourseEligible(course, learner)).toBe(true);
    expect(isCourseEligible(course, { ...learner, profession: 'montageelektriker' })).toBe(true);
  });
});
