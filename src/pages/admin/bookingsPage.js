import { adminShell } from '../../app/appShell.js';
import { listBookings, adminCancelBooking } from '../../api/bookingApi.js';
import { h, setBusy } from '../../utils/dom.js';
import { formatDate, formatDateTime } from '../../utils/dates.js';
import { formatBookingStatus, learnerName, pluralizeDays } from '../../utils/formatters.js';
import { normalizeError } from '../../utils/errors.js';
import {
  button,
  card,
  field,
  formMessage,
  iconButton,
  pageHeader,
  selectField,
  statusBadge,
  textareaField,
} from '../../components/common/ui.js';
import { dataTable } from '../../components/common/dataTable.js';
import { openAdminBookingDialog } from '../../components/admin/adminBookingDialog.js';
import { openDialog } from '../../components/common/dialog.js';
import { showToast } from '../../components/common/toast.js';

function bookingDetails(booking, onChanged) {
  const activeDates = booking.booking_days
    .filter((day) => day.is_active)
    .map((day) => day.booking_date)
    .sort();
  const content = h(
    'div',
    { class: 'booking-detail stack' },
    h(
      'div',
      { class: 'booking-context-grid' },
      h(
        'div',
        {},
        h('span', { text: 'Lernender' }),
        h('strong', { text: learnerName(booking.learners) }),
      ),
      h(
        'div',
        {},
        h('span', { text: 'Kurs' }),
        h('strong', { text: booking.course_title_snapshot }),
      ),
      h('div', {}, h('span', { text: 'Box' }), h('strong', { text: booking.boxes?.name ?? '–' })),
      h(
        'div',
        {},
        h('span', { text: 'Status' }),
        statusBadge(
          formatBookingStatus(booking.status),
          booking.status === 'confirmed' ? 'success' : 'neutral',
        ),
      ),
      h(
        'div',
        {},
        h('span', { text: 'Dauer' }),
        h('strong', { text: pluralizeDays(booking.course_duration_snapshot) }),
      ),
      h(
        'div',
        {},
        h('span', { text: 'Erstellt' }),
        h('strong', { text: formatDateTime(booking.created_at) }),
      ),
    ),
    h(
      'div',
      { class: 'stack', style: { '--stack-gap': '8px' } },
      h('strong', { text: 'Kurstage' }),
      h(
        'div',
        { class: 'date-chip-list' },
        activeDates.length
          ? activeDates.map((date) => h('span', { text: formatDate(date) }))
          : h('span', { class: 'muted', text: 'Keine aktiven Kurstage' }),
      ),
    ),
    booking.cancellation_reason
      ? h(
          'div',
          { class: 'info-callout' },
          h('strong', { text: 'Stornierungsgrund' }),
          h('p', { text: booking.cancellation_reason }),
        )
      : null,
  );
  let dialog;
  const actions = [{ label: 'Schliessen' }];
  if (booking.status === 'confirmed') {
    actions.push(
      {
        label: 'Verschieben',
        onClick: (_event, close) => {
          close();
          openAdminBookingDialog({ booking, onSaved: onChanged });
        },
      },
      {
        label: 'Stornieren',
        variant: 'danger',
        onClick: (_event, close) => {
          close();
          cancelBookingDialog(booking, onChanged);
        },
      },
    );
  }
  dialog = openDialog({
    title: `Buchung ${booking.id.slice(0, 8).toUpperCase()}`,
    content,
    actions,
    size: 'large',
  });
  return dialog;
}

function cancelBookingDialog(booking, onChanged) {
  const message = formMessage();
  const form = h(
    'form',
    { class: 'stack' },
    h('p', {
      text: `Die Buchung von ${learnerName(booking.learners)} wird storniert. Kurstage werden freigegeben und Credits zurückgebucht.`,
    }),
    textareaField({ label: 'Stornierungsgrund (optional)', name: 'reason', maxlength: 500 }),
    message,
  );
  openDialog({
    title: 'Buchung stornieren?',
    content: form,
    actions: [
      { label: 'Abbrechen' },
      {
        label: 'Verbindlich stornieren',
        variant: 'danger',
        onClick: async (event, close) => {
          const submitButton = event.currentTarget;
          setBusy(submitButton, true, 'Stornieren …');
          try {
            const { reason } = Object.fromEntries(new FormData(form));
            await adminCancelBooking(booking.id, reason);
            close();
            showToast('Buchung wurde storniert.');
            await onChanged();
          } catch (error) {
            message.textContent = normalizeError(error).message;
            message.classList.remove('is-hidden');
            setBusy(submitButton, false);
          }
        },
      },
    ],
  });
}

export async function bookingsPage() {
  const container = h('div', { class: 'admin-page' });
  const filters = { search: '', status: '', from: '', to: '' };
  const render = async () => {
    const bookings = await listBookings(filters);
    const filterForm = h(
      'form',
      {
        class: 'filter-bar',
        'on:submit': async (event) => {
          event.preventDefault();
          Object.assign(filters, Object.fromEntries(new FormData(event.currentTarget)));
          await render();
        },
      },
      field({
        label: 'Suche',
        name: 'search',
        value: filters.search,
        placeholder: 'Lernender, Kurs oder Box',
      }),
      selectField({
        label: 'Status',
        name: 'status',
        value: filters.status,
        options: [
          { value: '', label: 'Alle Status' },
          { value: 'confirmed', label: 'Bestätigt' },
          { value: 'cancelled', label: 'Storniert' },
        ],
      }),
      field({ label: 'Von', name: 'from', type: 'date', value: filters.from }),
      field({ label: 'Bis', name: 'to', type: 'date', value: filters.to }),
      button('Filtern', { type: 'submit', variant: 'secondary' }),
    );
    container.replaceChildren(
      pageHeader('Buchungen', 'Suchen, prüfen, verschieben, stornieren oder manuell erstellen.', [
        button('Manuell buchen', {
          icon: 'plus',
          onClick: () => openAdminBookingDialog({ onSaved: render }),
        }),
      ]),
      card({ class: 'filter-card' }, filterForm),
      card(
        { class: 'stack' },
        dataTable({
          rows: bookings,
          rowLabel: 'Liste der Buchungen',
          emptyTitle: 'Keine Buchungen für diese Filter gefunden.',
          columns: [
            {
              label: 'Lernender',
              render: (row) =>
                h(
                  'div',
                  { class: 'table-primary' },
                  h('strong', { text: learnerName(row.learners) }),
                  h('span', { text: row.learners?.email }),
                ),
            },
            { label: 'Kurs', render: (row) => row.course_title_snapshot },
            { label: 'Box', render: (row) => row.boxes?.name },
            {
              label: 'Kurstage',
              render: (row) =>
                row.booking_days
                  .filter((day) => day.is_active)
                  .map((day) => day.booking_date)
                  .sort()
                  .map((date) => formatDate(date, { short: true }))
                  .join(', ') || '–',
            },
            {
              label: 'Status',
              render: (row) =>
                statusBadge(
                  formatBookingStatus(row.status),
                  row.status === 'confirmed' ? 'success' : 'neutral',
                ),
            },
          ],
          rowActions: (row) =>
            iconButton('arrowRight', 'Buchungsdetails öffnen', () => bookingDetails(row, render)),
        }),
      ),
    );
  };
  await render();
  return adminShell(container);
}
