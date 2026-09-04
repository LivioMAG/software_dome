import { afterEach, describe, expect, it, vi } from 'vitest';

import { h } from '../src/utils/dom.js';

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
});
