import { h } from '../../utils/dom.js';
import { button, iconButton } from './ui.js';

export function openDialog({
  title,
  description,
  content,
  actions = [],
  size = 'medium',
  onClose,
}) {
  const region = document.querySelector('#dialog-region');
  const previouslyFocused = document.activeElement;
  let closed = false;
  const close = (result = null) => {
    if (closed) return result;
    closed = true;
    backdrop.classList.remove('is-open');
    window.setTimeout(() => {
      backdrop.remove();
      previouslyFocused?.focus?.();
    }, 180);
    onClose?.(result);
    return result;
  };

  const backdrop = h(
    'div',
    {
      class: 'dialog-backdrop',
      'on:mousedown': (event) => {
        if (event.target === backdrop) close();
      },
    },
    h(
      'section',
      {
        class: `dialog dialog--${size}`,
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'dialog-title',
      },
      h(
        'header',
        { class: 'dialog__header' },
        h(
          'div',
          {},
          h('h2', { id: 'dialog-title', text: title }),
          description ? h('p', { text: description }) : null,
        ),
        iconButton('close', 'Dialog schliessen', () => close()),
      ),
      h('div', { class: 'dialog__content' }, content),
      actions.length
        ? h(
            'footer',
            { class: 'dialog__actions' },
            actions.map((action) =>
              button(action.label, {
                variant: action.variant ?? 'secondary',
                type: action.type,
                disabled: action.disabled,
                onClick: action.onClick ? (event) => action.onClick(event, close) : () => close(),
              }),
            ),
          )
        : null,
    ),
  );

  const keyHandler = (event) => {
    if (event.key === 'Escape') close();
    if (event.key === 'Tab') {
      const focusable = [
        ...backdrop.querySelectorAll('button, input, select, textarea, a[href]'),
      ].filter((element) => !element.disabled);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };
  backdrop.addEventListener('keydown', keyHandler);
  region.append(backdrop);
  requestAnimationFrame(() => {
    backdrop.classList.add('is-open');
    backdrop.querySelector('input, select, textarea, button')?.focus();
  });
  return { close, element: backdrop };
}

export function confirmDialog({ title, description, confirmLabel = 'Bestätigen', danger = false }) {
  return new Promise((resolve) => {
    openDialog({
      title,
      description,
      content: h('div', { class: 'confirm-symbol', text: danger ? '!' : '?' }),
      onClose: (result) => resolve(Boolean(result)),
      actions: [
        { label: 'Abbrechen', onClick: (_event, close) => close(false) },
        {
          label: confirmLabel,
          variant: danger ? 'danger' : 'primary',
          onClick: (_event, close) => close(true),
        },
      ],
      size: 'small',
    });
  });
}
