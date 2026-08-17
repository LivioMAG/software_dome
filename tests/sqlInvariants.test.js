import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(new URL('../supabase/mastermag_setup.sql', import.meta.url), 'utf8');

describe('Datenbank-Invarianten', () => {
  it('erzwingt eine aktive Belegung pro Box und Datum', () => {
    expect(sql).toContain('booking_days_one_active_box_per_date');
    expect(sql).toMatch(/on public\.booking_days \(box_id, booking_date\)\s+where is_active/);
  });

  it('erzwingt eine aktive Buchung pro Lernendem und Datum', () => {
    expect(sql).toContain('booking_days_one_active_learner_per_date');
    expect(sql).toMatch(/on public\.booking_days \(learner_id, booking_date\)\s+where is_active/);
  });

  it('serialisiert parallele Buchungsversuche mit Advisory Locks', () => {
    expect(sql).toContain('pg_advisory_xact_lock');
    expect(sql).toContain("raise exception 'BOOKING_CONFLICT'");
  });

  it('verhindert Sperrzeiten über bestehenden Buchungen', () => {
    expect(sql).toContain('box_blocks_prevent_booking_conflict');
    expect(sql).toContain("raise exception 'BLOCK_CONFLICT'");
  });

  it('speichert Lernenden-Sitzungstokens nur gehasht', () => {
    expect(sql).toContain('token_hash bytea not null unique');
    expect(sql).toContain("extensions.digest(convert_to(v_token, 'UTF8'), 'sha256')");
    expect(sql).not.toMatch(/session_token\s+text\s+not null/i);
  });

  it('hält Lernende bis zum bewussten Abmelden angemeldet', () => {
    expect(sql).toContain("v_expires_at timestamptz := 'infinity'::timestamptz");
    expect(sql).toContain('set revoked_at = now()');
  });
});
