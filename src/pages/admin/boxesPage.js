import { adminShell } from '../../app/appShell.js';
import { listBoxes, saveBox, setBoxActive } from '../../api/boxesApi.js';
import { h, setBusy } from '../../utils/dom.js';
import { normalizeError } from '../../utils/errors.js';
import {
  button,
  card,
  field,
  formMessage,
  pageHeader,
  selectField,
  statusBadge,
  textareaField,
} from '../../components/common/ui.js';
import { confirmDialog, openDialog } from '../../components/common/dialog.js';
import { showToast } from '../../components/common/toast.js';

function boxDialog(box, onSaved) {
  const message = formMessage();
  const form = h(
    'form',
    { class: 'stack' },
    field({ label: 'Name', name: 'name', value: box?.name, required: true, maxlength: 100 }),
    textareaField({
      label: 'Interne Beschreibung',
      name: 'description',
      value: box?.description,
      maxlength: 500,
    }),
    h(
      'div',
      { class: 'form-grid' },
      field({
        label: 'Sortierreihenfolge',
        name: 'display_order',
        type: 'number',
        value: box?.display_order ?? 0,
        min: 0,
      }),
      selectField({
        label: 'Status',
        name: 'active',
        value: box?.active === false ? 'false' : 'true',
        options: [
          { value: 'true', label: 'Aktiv' },
          { value: 'false', label: 'Deaktiviert' },
        ],
      }),
    ),
    message,
  );
  openDialog({
    title: box ? 'Box bearbeiten' : 'Box erstellen',
    description: 'Boxen sind physische Arbeitsplätze und pro Tag nur einmal belegbar.',
    content: form,
    actions: [
      { label: 'Abbrechen' },
      {
        label: 'Speichern',
        variant: 'primary',
        onClick: async (event, close) => {
          setBusy(event.currentTarget, true, 'Speichern …');
          try {
            const values = Object.fromEntries(new FormData(form));
            values.active = values.active === 'true';
            await saveBox(values, box?.id);
            close();
            showToast(box ? 'Box wurde aktualisiert.' : 'Box wurde erstellt.');
            await onSaved();
          } catch (error) {
            message.textContent = normalizeError(error).message;
            message.classList.remove('is-hidden');
            setBusy(event.currentTarget, false);
          }
        },
      },
    ],
  });
}

export async function boxesPage() {
  const container = h('div', { class: 'admin-page' });
  const render = async () => {
    const boxes = await listBoxes();
    container.replaceChildren(
      pageHeader('Boxen', 'Physische Arbeitsplätze, Sortierung und Verfügbarkeit verwalten.', [
        button('Box erstellen', { icon: 'plus', onClick: () => boxDialog(null, render) }),
      ]),
      h(
        'section',
        { class: 'box-grid' },
        boxes.map((box) =>
          card(
            { class: `box-admin-card${box.active ? '' : ' is-inactive'}` },
            h(
              'header',
              { class: 'split' },
              h('span', { class: 'box-admin-card__order', text: String(box.display_order) }),
              statusBadge(box.active ? 'Aktiv' : 'Deaktiviert', box.active ? 'success' : 'neutral'),
            ),
            h('h2', { text: box.name }),
            h('p', {
              class: 'muted',
              text: box.description || 'Keine interne Beschreibung hinterlegt.',
            }),
            h(
              'footer',
              { class: 'cluster' },
              button('Bearbeiten', {
                variant: 'secondary',
                icon: 'edit',
                onClick: () => boxDialog(box, render),
              }),
              button(box.active ? 'Deaktivieren' : 'Aktivieren', {
                variant: 'ghost',
                onClick: async () => {
                  const confirmed = await confirmDialog({
                    title: box.active ? 'Box deaktivieren?' : 'Box aktivieren?',
                    description: box.active
                      ? 'Neue Buchungen sind danach nicht mehr möglich. Bestehende Buchungen bleiben bestehen.'
                      : 'Die Box wird wieder für neue Buchungen angeboten.',
                    confirmLabel: box.active ? 'Deaktivieren' : 'Aktivieren',
                    danger: box.active,
                  });
                  if (!confirmed) return;
                  await setBoxActive(box.id, !box.active);
                  showToast(box.active ? 'Box wurde deaktiviert.' : 'Box wurde aktiviert.');
                  await render();
                },
              }),
            ),
          ),
        ),
      ),
    );
  };
  await render();
  return adminShell(container);
}
