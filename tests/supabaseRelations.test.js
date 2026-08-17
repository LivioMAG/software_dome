import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const bookingApi = readFileSync(new URL('../src/api/bookingApi.js', import.meta.url), 'utf8');
const adminApi = readFileSync(new URL('../src/api/adminApi.js', import.meta.url), 'utf8');

describe('Eindeutige Supabase-Beziehungen', () => {
  it('verwendet bei Buchungen explizit den gebuchten Lernenden', () => {
    expect(bookingApi).toContain(
      'learners:learners!bookings_learner_id_fkey(id,first_name,last_name,email)',
    );
  });

  it('verwendet in der Wochenplanung explizit den gebuchten Lernenden', () => {
    expect(adminApi).toContain('learners:learners!bookings_learner_id_fkey(first_name,last_name)');
  });
});
