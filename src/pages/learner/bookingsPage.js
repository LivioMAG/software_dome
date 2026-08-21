import { learnerShell } from '../../app/appShell.js';
import { loadLearnerPortal, getLearnerToken } from '../../auth/learnerSession.js';
import { cancelLearnerBooking } from '../../api/learnerApi.js';
import { h } from '../../utils/dom.js';
import { formatDate } from '../../utils/dates.js';
import { formatBookingStatus } from '../../utils/formatters.js';
import { normalizeError } from '../../utils/errors.js';
import { button, card, emptyState, pageHeader, statusBadge } from '../../components/common/ui.js';
import { confirmDialog } from '../../components/common/dialog.js';
import { showToast } from '../../components/common/toast.js';
import { sendCancellationEmail } from '../../lib/email.js';

export async function learnerBookingsPage() {
  const portal = await loadLearnerPortal({ force: true });
  const bookings = portal.bookings ?? [];
  const container = h('div', { class: 'learner-page' });
  const render = () => {
    container.replaceChildren(
      pageHeader('Meine Buchungen', 'Aktive und vergangene Kursbuchungen.'),
      h(
        'section',
        { class: 'learner-booking-list' },
        bookings.length
          ? bookings.map((booking) => {
              const dates = booking.dates ?? [];
              return card(
                {
                  class: `learner-booking-card${booking.status === 'cancelled' ? ' is-cancelled' : ''}`,
                },
                h(
                  'header',
                  { class: 'split' },
                  statusBadge(
                    formatBookingStatus(booking.status),
                    booking.status === 'confirmed' ? 'success' : 'neutral',
                  ),
                  h('span', { class: 'booking-number', text: booking.booking_number }),
                ),
                h('h2', { text: booking.course_title }),
                h('p', { class: 'muted', text: booking.box_name }),
                h(
                  'div',
                  { class: 'date-chip-list' },
                  dates.map((date) => h('span', { text: formatDate(date) })),
                ),
                booking.status === 'confirmed'
                  ? booking.can_cancel
                    ? button('Buchung stornieren', {
                        variant: 'secondary',
                        onClick: async () => {
                          const confirmed = await confirmDialog({
                            title: 'Buchung stornieren?',
                            description:
                              'Die reservierten Kurstage werden freigegeben und die verwendeten Credits bis maximal 5 zurückgebucht.',
                            confirmLabel: 'Buchung stornieren',
                            danger: true,
                          });
                          if (!confirmed) return;
                          try {
                            await cancelLearnerBooking(getLearnerToken(), booking.id);
                            const emailSent = await sendCancellationEmail({
                              to_email: portal.learner.gl_email,
                              to_name: portal.learner.gl_name,
                              learner_name: `${portal.learner.first_name} ${portal.learner.last_name}`,
                              course: booking.course_title,
                              dates: booking.dates.join(', '),
                              booking_number: booking.booking_number,
                            }).catch(() => false);
                            showToast('Deine Buchung wurde storniert.');
                            if (!emailSent)
                              showToast(
                                'Stornierung gespeichert; die GL-E-Mail konnte nicht versendet werden.',
                                'error',
                              );
                            const refreshed = await loadLearnerPortal({ force: true });
                            bookings.splice(0, bookings.length, ...(refreshed.bookings ?? []));
                            render();
                          } catch (error) {
                            showToast(normalizeError(error).message, 'error');
                          }
                        },
                      })
                    : h('p', {
                        class: 'late-cancellation-note',
                        text: 'Diese Buchung kann nicht mehr selbst storniert werden. Bitte wende dich an den Administrator.',
                      })
                  : booking.cancellation_reason
                    ? h('p', { class: 'muted', text: `Grund: ${booking.cancellation_reason}` })
                    : null,
              );
            })
          : card(
              {},
              emptyState(
                'Du hast noch keine Kurse gebucht.',
                'Wähle einen passenden Kurs und prüfe die freien Boxen.',
                button('Kurs auswählen', { href: '#/learner/courses' }),
              ),
            ),
      ),
    );
  };
  render();
  return learnerShell(container, { active: 'bookings' });
}
