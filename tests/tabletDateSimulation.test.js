import { describe, expect, it } from 'vitest';
import {
  clearTabletDate,
  getTabletDate,
  setTabletDate,
  TABLET_DATE_KEY,
} from '../src/utils/tabletDateSimulation.js';

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

describe('Datumssimulation auf dem Box-Tablet', () => {
  const actualDate = '2026-08-26';

  it('verwendet ohne Simulation das tatsächliche Datum', () => {
    expect(getTabletDate(createStorage(), actualDate)).toBe(actualDate);
  });

  it('behält das simulierte Datum für weitere Aufrufe bei', () => {
    const storage = createStorage();

    setTabletDate('2026-09-14', storage, actualDate);

    expect(storage.getItem(TABLET_DATE_KEY)).toBe('2026-09-14');
    expect(getTabletDate(storage, actualDate)).toBe('2026-09-14');
  });

  it('kehrt zum tatsächlichen Datum zurück', () => {
    const storage = createStorage();
    setTabletDate('2026-09-14', storage, actualDate);

    clearTabletDate(storage);

    expect(getTabletDate(storage, actualDate)).toBe(actualDate);
  });

  it('speichert das tatsächliche Datum nicht als Simulation', () => {
    const storage = createStorage();
    setTabletDate('2026-09-14', storage, actualDate);

    setTabletDate(actualDate, storage, actualDate);

    expect(storage.getItem(TABLET_DATE_KEY)).toBeNull();
  });
});
