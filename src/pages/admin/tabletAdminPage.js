import { adminShell } from '../../app/appShell.js';
import { generateTabletCode, getTabletCode } from '../../api/tabletApi.js';
import { h, setBusy } from '../../utils/dom.js';
import { button, card, pageHeader } from '../../components/common/ui.js';
import { showToast } from '../../components/common/toast.js';

export async function tabletAdminPage() {
  const currentCode = await getTabletCode();
  const code = h('strong', {
    class: 'tablet-code',
    text: currentCode ?? 'Noch kein Code',
  });
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
          text: 'Der aktuell gültige Code bleibt hier sichtbar. Ein neuer Code trennt alle bisher verbundenen Tablets.',
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
