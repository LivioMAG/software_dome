import { adminShell } from '../../app/appShell.js';
import { generateTabletCode, getTabletCode } from '../../api/tabletApi.js';
import { h, setBusy } from '../../utils/dom.js';
import { normalizeError } from '../../utils/errors.js';
import { button, card, pageHeader } from '../../components/common/ui.js';
import { showToast } from '../../components/common/toast.js';

export async function tabletAdminPage() {
  let currentCode = null;
  let codeLoadFailed = false;
  try {
    currentCode = await getTabletCode();
  } catch {
    // A failed lookup must not hide the action that creates (and returns) a new code.
    codeLoadFailed = true;
  }
  const code = h('strong', {
    class: 'tablet-code',
    text: currentCode ?? (codeLoadFailed ? 'Code konnte nicht geladen werden' : 'Noch kein Code'),
  });
  const action = button('Neuen Code erstellen', {
    icon: 'lock',
    onClick: async (event) => {
      setBusy(event.currentTarget, true, 'Code erstellen …');
      try {
        code.textContent = await generateTabletCode();
        showToast('Alle bisherigen Tablet-Verbindungen wurden getrennt.');
      } catch (error) {
        showToast(normalizeError(error).message, 'error');
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
