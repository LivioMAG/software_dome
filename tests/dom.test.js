import { afterEach, describe, expect, it, vi } from 'vitest';

import { h } from '../src/utils/dom.js';
import { getDialogRegion, openDialog } from '../src/components/common/dialog.js';

describe('DOM-Helfer', () => {
  const originalDocument = globalThis.document;
  const originalNode = globalThis.Node;

  afterEach(() => {
    globalThis.document = originalDocument;
    globalThis.Node = originalNode;
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

  it('macht einen geöffneten Dialog sofort sichtbar', () => {
    const region = { append: vi.fn() };
    globalThis.Node = class {};
    const createElement = (tag) => {
      const element = new globalThis.Node();
      Object.assign(element, {
        tagName: tag.toUpperCase(),
        children: [],
        className: '',
        append(...children) {
          this.children.push(...children);
        },
        addEventListener: vi.fn(),
        querySelector: vi.fn(() => null),
        setAttribute: vi.fn(),
      });
      element.classList = {
        add: vi.fn((name) => {
          element.className = `${element.className} ${name}`.trim();
        }),
        remove: vi.fn(),
      };
      return element;
    };
    globalThis.document = {
      activeElement: null,
      querySelector: vi.fn(() => region),
      createElement: vi.fn(createElement),
      createTextNode: vi.fn((text) => text),
    };

    const dialog = openDialog({ title: 'Geschäftsstelle erfassen' });

    expect(region.append).toHaveBeenCalledWith(dialog.element);
    expect(dialog.element.className.split(' ')).toContain('is-open');
  });
});
