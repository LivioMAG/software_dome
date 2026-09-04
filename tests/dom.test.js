import { afterEach, describe, expect, it, vi } from 'vitest';

import { h } from '../src/utils/dom.js';
import { getDialogRegion } from '../src/components/common/dialog.js';

describe('DOM-Helfer', () => {
  const originalDocument = globalThis.document;

  afterEach(() => {
    globalThis.document = originalDocument;
  });

  it('setzt das form-Attribut bei externen Submit-Buttons', () => {
    const setAttribute = vi.fn();
    const element = {
      append: vi.fn(),
      setAttribute,
    };
    Object.defineProperty(element, 'form', {
      get: () => null,
    });
    globalThis.document = {
      createElement: vi.fn(() => element),
    };

    expect(() => h('button', { form: 'business-office-form' })).not.toThrow();
    expect(setAttribute).toHaveBeenCalledWith('form', 'business-office-form');
  });

  it('erstellt den Dialogbereich, wenn er im HTML-Shell fehlt', () => {
    const append = vi.fn();
    const region = { append: vi.fn(), setAttribute: vi.fn() };
    globalThis.document = {
      querySelector: vi.fn(() => null),
      createElement: vi.fn(() => region),
      body: { append },
    };

    expect(getDialogRegion()).toBe(region);
    expect(region.setAttribute).toHaveBeenCalledWith('id', 'dialog-region');
    expect(append).toHaveBeenCalledWith(region);
  });

  it('verwendet einen vorhandenen Dialogbereich wieder', () => {
    const region = { append: vi.fn() };
    globalThis.document = {
      querySelector: vi.fn(() => region),
    };

    expect(getDialogRegion()).toBe(region);
  });
});
