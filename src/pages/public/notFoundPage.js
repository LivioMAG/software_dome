import { publicShell } from '../../app/appShell.js';
import { h } from '../../utils/dom.js';
import { button, card } from '../../components/common/ui.js';

export const notFoundPage = () =>
  publicShell(
    card(
      { class: 'not-found stack' },
      h('span', { class: 'eyebrow', text: 'Fehler 404' }),
      h('h1', { text: 'Diese Seite wurde nicht gefunden.' }),
      h('p', { text: 'Der aufgerufene Bereich existiert nicht oder wurde verschoben.' }),
      button('Zur Startseite', { href: '#/', icon: 'arrowLeft' }),
    ),
  );
