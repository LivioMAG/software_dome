import { publicShell } from '../../app/appShell.js';
import { h } from '../../utils/dom.js';
import { card, button } from '../../components/common/ui.js';
import { icon } from '../../components/common/icons.js';

export function setupPage(error) {
  return publicShell(
    h(
      'div',
      { class: 'setup-page' },
      card(
        { class: 'setup-card stack' },
        h('span', { class: 'setup-card__icon', html: icon('settings', 30) }),
        h('span', { class: 'eyebrow', text: 'Einrichtung erforderlich' }),
        h('h1', { text: 'MasterMag konfigurieren' }),
        h('p', { text: error.message }),
        h(
          'ol',
          { class: 'setup-steps' },
          h(
            'li',
            {},
            h('strong', { text: '1' }),
            h('span', { text: 'public/config.example.json kopieren' }),
          ),
          h(
            'li',
            {},
            h('strong', { text: '2' }),
            h('span', { text: 'Kopie als public/config.json speichern' }),
          ),
          h(
            'li',
            {},
            h('strong', { text: '3' }),
            h('span', { text: 'Supabase-URL und Anon-Key eintragen' }),
          ),
        ),
        button('Konfiguration erneut prüfen', {
          onClick: () => window.location.reload(),
          icon: 'refresh',
        }),
      ),
    ),
  );
}
