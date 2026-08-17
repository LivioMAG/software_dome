import { h } from '../../utils/dom.js';
import { icon } from './icons.js';

export function showToast(message, tone = 'success', duration = 4200) {
  const region = document.querySelector('#toast-region');
  const toast = h(
    'div',
    { class: `toast toast--${tone}`, role: tone === 'error' ? 'alert' : 'status' },
    h('span', { class: 'toast__icon', html: icon(tone === 'error' ? 'alert' : 'check', 19) }),
    h('span', { text: message }),
    h('button', {
      class: 'toast__close',
      type: 'button',
      'aria-label': 'Meldung schliessen',
      html: icon('close', 16),
      'on:click': () => toast.remove(),
    }),
  );
  region.append(toast);
  requestAnimationFrame(() => toast.classList.add('is-visible'));
  window.setTimeout(() => {
    toast.classList.remove('is-visible');
    window.setTimeout(() => toast.remove(), 200);
  }, duration);
}
