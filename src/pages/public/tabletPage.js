import { publicShell } from '../../app/appShell.js';
import { connectBoxTablet, getBoxTabletDay, listTabletBoxes } from '../../api/tabletApi.js';
import { h, setBusy } from '../../utils/dom.js';
import {
  button,
  card,
  emptyState,
  field,
  formMessage,
  selectField,
} from '../../components/common/ui.js';
import { formatDate, todayIso } from '../../utils/dates.js';
import { normalizeError } from '../../utils/errors.js';
import { getSupabase } from '../../lib/supabaseClient.js';

const TOKEN_KEY = 'mastermag_tablet_token';
export async function tabletPage() {
  const root = h('div', { class: 'tablet-page stack' });
  const showDay = async (token, date = todayIso()) => {
    const data = await getBoxTabletDay(token, date);
    const bookings = data.bookings.map((booking) =>
      card(
        { class: 'stack' },
        h('span', { class: 'eyebrow', text: formatDate(data.date) }),
        h('h2', { text: booking.learner_name }),
        h('strong', { text: booking.course_title }),
        booking.remark ? h('p', { text: booking.remark }) : null,
        h(
          'div',
          { class: 'cluster' },
          booking.documents.map((document) =>
            button(document.name, {
              variant: 'secondary',
              onClick: () =>
                window.open(
                  getSupabase().storage.from('course-documents').getPublicUrl(document.path).data
                    .publicUrl,
                  '_blank',
                  'noopener',
                ),
            }),
          ),
        ),
      ),
    );
    root.replaceChildren(
      h(
        'header',
        { class: 'split' },
        h(
          'div',
          {},
          h('span', { class: 'eyebrow', text: 'Verbunden' }),
          h('h1', { text: data.box_name }),
        ),
        field({
          label: 'Datum',
          name: 'date',
          type: 'date',
          value: date,
          onChange: (event) => showDay(token, event.target.value),
        }),
      ),
      data.bookings.length
        ? h('section', { class: 'box-grid' }, bookings)
        : emptyState(
            'Heute keine Buchung',
            'Für diese Box ist am gewählten Tag kein Kurs eingetragen.',
          ),
      button('Verbindung trennen', {
        variant: 'ghost',
        onClick: () => {
          localStorage.removeItem(TOKEN_KEY);
          window.location.reload();
        },
      }),
    );
  };
  const existing = localStorage.getItem(TOKEN_KEY);
  if (existing) {
    try {
      await showDay(existing);
      return publicShell(root);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
    }
  }
  const boxes = await listTabletBoxes();
  const message = formMessage();
  const submit = button('Mit Box verbinden', { type: 'submit', class: 'full-width' });
  const form = h(
    'form',
    {
      class: 'stack',
      'on:submit': async (event) => {
        event.preventDefault();
        setBusy(submit, true, 'Verbinden …');
        try {
          const values = Object.fromEntries(new FormData(event.currentTarget));
          const token = await connectBoxTablet(values.code, values.box_id);
          localStorage.setItem(TOKEN_KEY, token);
          await showDay(token);
        } catch (error) {
          message.textContent = normalizeError(error).message;
          message.classList.remove('is-hidden');
          setBusy(submit, false);
        }
      },
    },
    selectField({
      label: 'Arbeitsbox',
      name: 'box_id',
      options: boxes.map((box) => ({ value: box.id, label: box.name })),
    }),
    field({
      label: 'Sechsstelliger Verbindungscode',
      name: 'code',
      inputmode: 'numeric',
      pattern: '[0-9]{6}',
      maxlength: 6,
      required: true,
    }),
    message,
    submit,
  );
  root.replaceChildren(
    card(
      { class: 'single-auth-card stack' },
      h('span', { class: 'eyebrow', text: 'Box-Tablet' }),
      h('h1', { text: 'Mit Arbeitsbox verbinden' }),
      h('p', { class: 'muted', text: 'Wähle die Box und gib den Code aus dem Admin-Panel ein.' }),
      form,
    ),
  );
  return publicShell(root);
}
