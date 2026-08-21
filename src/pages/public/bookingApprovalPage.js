import { publicShell } from '../../app/appShell.js';
import { approveBooking } from '../../api/learnerApi.js';
import { h } from '../../utils/dom.js';
import { button, card } from '../../components/common/ui.js';
import { normalizeError } from '../../utils/errors.js';

export function bookingApprovalPage() {
  const token = new URLSearchParams(window.location.hash.split('?')[1] || '').get('token');
  const content = card(
    { class: 'single-auth-card stack' },
    h('h1', { text: 'Buchung freigeben' }),
    h('p', { text: 'Bitte bestätige oder lehne die Kursbuchung als Geschäftsleitung ab.' }),
    h(
      'div',
      { class: 'cluster' },
      ...[true, false].map((approved) =>
        button(approved ? 'Buchung freigeben' : 'Ablehnen', {
          variant: approved ? 'primary' : 'secondary',
          disabled: !token,
          onClick: async (event) => {
            try {
              await approveBooking(token, approved);
              content.replaceChildren(
                h('h1', { text: approved ? 'Buchung freigegeben' : 'Buchung abgelehnt' }),
                h('p', {
                  text: 'Die Entscheidung wurde gespeichert. Dieses Fenster kann geschlossen werden.',
                }),
              );
            } catch (error) {
              event.currentTarget.disabled = false;
              content.append(
                h('p', { class: 'form-message', text: normalizeError(error).message }),
              );
            }
          },
        }),
      ),
    ),
  );
  return publicShell(h('div', { class: 'single-auth-page' }, content));
}
