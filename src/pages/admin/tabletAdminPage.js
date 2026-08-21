import { adminShell } from '../../app/appShell.js';
import { generateTabletCode } from '../../api/tabletApi.js';
import { h, setBusy } from '../../utils/dom.js';
import { button, card, pageHeader } from '../../components/common/ui.js';
import { showToast } from '../../components/common/toast.js';

export function tabletAdminPage() {
  const code = h('strong', { class: 'tablet-code', text: '••••••' });
  const action = button('Neuen Code erstellen', {
    icon: 'lock',
    onClick: async (event) => {
      setBusy(event.currentTarget, true, 'Code erstellen …');
      try {
        code.textContent = await generateTabletCode();
        showToast('Alle bisherigen Tablet-Verbindungen wurden getrennt.');
      } finally {
        setBusy(event.currentTarget, false);
      }
    },
  });
  return adminShell(
    h(
      'div',
      { class: 'admin-page' },
      pageHeader('Tablet-Zugang', 'Schütze die Verbindung zu den Arbeitsboxen.'),
      card(
        { class: 'stack single-auth-card' },
        h('h2', { text: 'Verbindungscode' }),
        code,
        h('p', {
          class: 'muted',
          text: 'Der Code wird aus Sicherheitsgründen nur direkt nach dem Erstellen angezeigt. Ein neuer Code trennt alle Tablets.',
        }),
        action,
        button('Tablet-Oberfläche öffnen', {
          href: '#/tablet',
          variant: 'secondary',
          trailingIcon: 'arrowRight',
        }),
      ),
    ),
  );
}
