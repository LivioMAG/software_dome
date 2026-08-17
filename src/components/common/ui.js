import { h } from '../../utils/dom.js';
import { icon } from './icons.js';

export function brand({ compact = false } = {}) {
  return h(
    'a',
    {
      class: `brand${compact ? ' brand--compact' : ''}`,
      href: '#/',
      'aria-label': 'MasterMag Startseite',
    },
    h('span', { class: 'brand__mark', text: 'M' }),
    h(
      'span',
      { class: 'brand__copy' },
      h('strong', { text: 'MasterMag' }),
      h('small', { text: 'Kursplanung' }),
    ),
  );
}

export function button(label, options = {}) {
  const element = h(
    options.href ? 'a' : 'button',
    {
      class: `button button--${options.variant ?? 'primary'} ${options.class ?? ''}`.trim(),
      type: options.href ? undefined : (options.type ?? 'button'),
      href: options.href,
      disabled: options.disabled,
      title: options.title,
      'aria-label': options.ariaLabel,
      'on:click': options.onClick,
    },
    options.icon ? h('span', { class: 'button__icon', html: icon(options.icon, 18) }) : null,
    h('span', { text: label }),
    options.trailingIcon
      ? h('span', { class: 'button__icon', html: icon(options.trailingIcon, 18) })
      : null,
  );
  return element;
}

export function iconButton(iconName, label, onClick, options = {}) {
  return h('button', {
    class: `icon-button ${options.class ?? ''}`.trim(),
    type: 'button',
    html: icon(iconName, options.size ?? 19),
    title: label,
    'aria-label': label,
    disabled: options.disabled,
    'on:click': onClick,
  });
}

export function card(...children) {
  const options =
    children[0] && !(children[0] instanceof Node) && typeof children[0] === 'object'
      ? children.shift()
      : {};
  return h('section', { class: `glass-card ${options.class ?? ''}`.trim() }, children);
}

export function pageHeader(title, subtitle, actions = []) {
  return h(
    'header',
    { class: 'page-header' },
    h(
      'div',
      { class: 'stack', style: { '--stack-gap': '5px' } },
      h('h1', { text: title }),
      subtitle ? h('p', { text: subtitle }) : null,
    ),
    actions.length ? h('div', { class: 'page-header__actions cluster' }, actions) : null,
  );
}

export function sectionHeading(title, subtitle, action) {
  return h(
    'div',
    { class: 'section-heading' },
    h('div', {}, h('h2', { text: title }), subtitle ? h('p', { text: subtitle }) : null),
    action,
  );
}

export function field({
  label,
  name,
  type = 'text',
  value = '',
  required = false,
  help,
  ...attributes
}) {
  const input = h('input', {
    class: 'field__control',
    id: name,
    name,
    type,
    value,
    required,
    ...attributes,
  });
  return h(
    'label',
    { class: 'field', for: name },
    h('span', { class: 'field__label', text: label }),
    input,
    help ? h('span', { class: 'field__help', text: help }) : null,
  );
}

export function selectField({
  label,
  name,
  options,
  value = '',
  required = false,
  help,
  ...attributes
}) {
  const select = h(
    'select',
    { class: 'field__control', id: name, name, value, required, ...attributes },
    options.map((option) =>
      h('option', {
        value: option.value,
        text: option.label,
        selected: String(option.value) === String(value),
        disabled: option.disabled,
      }),
    ),
  );
  return h(
    'label',
    { class: 'field', for: name },
    h('span', { class: 'field__label', text: label }),
    select,
    help ? h('span', { class: 'field__help', text: help }) : null,
  );
}

export function textareaField({ label, name, value = '', help, ...attributes }) {
  return h(
    'label',
    { class: 'field', for: name },
    h('span', { class: 'field__label', text: label }),
    h('textarea', { class: 'field__control', id: name, name, value, rows: 4, ...attributes }),
    help ? h('span', { class: 'field__help', text: help }) : null,
  );
}

export function formMessage(message = '', tone = 'error') {
  return h('div', {
    class: `form-message form-message--${tone}${message ? '' : ' is-hidden'}`,
    text: message,
    role: tone === 'error' ? 'alert' : 'status',
  });
}

export function statusBadge(label, tone = 'neutral') {
  return h('span', { class: `status-badge status-badge--${tone}`, text: label });
}

export function loadingState(label = 'Daten werden geladen …') {
  return h(
    'div',
    { class: 'state-panel', role: 'status' },
    h('span', { class: 'spinner', 'aria-hidden': 'true' }),
    h('p', { text: label }),
  );
}

export function emptyState(title, description, action) {
  return h(
    'div',
    { class: 'state-panel state-panel--empty' },
    h('span', { class: 'state-panel__icon', html: icon('info', 24) }),
    h('h3', { text: title }),
    description ? h('p', { text: description }) : null,
    action,
  );
}

export function errorState(message, onRetry) {
  return h(
    'div',
    { class: 'state-panel state-panel--error', role: 'alert' },
    h('span', { class: 'state-panel__icon', html: icon('alert', 24) }),
    h('h3', { text: 'Das hat nicht funktioniert' }),
    h('p', { text: message }),
    onRetry
      ? button('Erneut versuchen', { variant: 'secondary', icon: 'refresh', onClick: onRetry })
      : null,
  );
}

export function statCard(label, value, options = {}) {
  return h(
    'article',
    { class: 'stat-card' },
    h('div', {
      class: `stat-card__icon stat-card__icon--${options.tone ?? 'default'}`,
      html: icon(options.icon ?? 'dashboard', 21),
    }),
    h('div', {}, h('strong', { text: String(value ?? '–') }), h('span', { text: label })),
  );
}

export function creditMeter(balance, options = {}) {
  const value = Math.max(0, Math.min(5, Number(balance ?? 0)));
  return h(
    'div',
    { class: `credit-meter ${options.large ? 'credit-meter--large' : ''}` },
    h(
      'div',
      { class: 'credit-meter__top' },
      h('span', { text: options.label ?? 'Verfügbare Kurstage' }),
      h('strong', { text: `${value} von 5` }),
    ),
    h('div', { class: 'credit-meter__track' }, h('span', { style: { width: `${value * 20}%` } })),
  );
}

export function divider(label) {
  return h('div', { class: 'divider' }, h('span', { text: label }));
}
