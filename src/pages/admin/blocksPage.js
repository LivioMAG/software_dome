import { adminShell } from '../../app/appShell.js';
import { createBlock, deleteBlock, listBlocks } from '../../api/adminApi.js';
import { listBoxes } from '../../api/boxesApi.js';
import { BLOCK_TYPES } from '../../constants/businessRules.js';
import { h, setBusy } from '../../utils/dom.js';
import { formatDate } from '../../utils/dates.js';
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
import { confirmDialog, openDialog } from '../../components/common/dialog.js';
import { showToast } from '../../components/common/toast.js';

async function blockDialog(onSaved) {
  const boxes = await listBoxes();
  const message = formMessage();
  const form = h(
    'form',
    { class: 'stack' },
    h(
      'div',
      { class: 'form-grid' },
      field({ label: 'Titel / Grund', name: 'title', required: true, maxlength: 160 }),
      selectField({
        label: 'Sperrtyp',
        name: 'block_type',
        value: 'other',
        options: Object.entries(BLOCK_TYPES).map(([value, label]) => ({ value, label })),
      }),
      field({ label: 'Startdatum', name: 'start_date', type: 'date', required: true }),
      field({ label: 'Enddatum', name: 'end_date', type: 'date', required: true }),
    ),
    selectField({
      label: 'Betroffene Box',
      name: 'box_id',
      options: [
        { value: '', label: 'Alle Boxen (globale Sperre)' },
        ...boxes.map((box) => ({ value: box.id, label: box.name })),
      ],
      help: 'Eine globale Sperre blockiert sämtliche Arbeitsboxen im Zeitraum.',
    }),
    textareaField({ label: 'Interne Notiz', name: 'reason', maxlength: 500 }),
    message,
  );
  openDialog({
    title: 'Sperrzeit erstellen',
    description: 'Bestehende Buchungen werden niemals überschrieben.',
    content: form,
    actions: [
      { label: 'Abbrechen' },
      {
        label: 'Sperrzeit erstellen',
        variant: 'primary',
        onClick: async (event, close) => {
          const submitButton = event.currentTarget;
          setBusy(submitButton, true, 'Prüfen …');
          try {
            await createBlock(Object.fromEntries(new FormData(form)));
            close();
            showToast('Sperrzeit wurde erstellt.');
            await onSaved();
          } catch (error) {
            const normalized = normalizeError(error);
            message.textContent = normalized.message.includes('BLOCK_CONFLICT')
              ? 'Im gewählten Zeitraum bestehen Buchungen. Verschiebe oder storniere diese zuerst.'
              : normalized.message;
            message.classList.remove('is-hidden');
            setBusy(submitButton, false);
          }
        },
      },
    ],
  });
}

export async function blocksPage() {
  const container = h('div', { class: 'admin-page' });
  const render = async () => {
    const blocks = await listBlocks();
    container.replaceChildren(
      pageHeader('Sperrzeiten', 'Feiertage, Wartungen und interne Belegungen verwalten.', [
        button('Sperrzeit erstellen', { icon: 'plus', onClick: () => blockDialog(render) }),
      ]),
      card(
        { class: 'stack' },
        dataTable({
          rows: blocks,
          rowLabel: 'Liste der Sperrzeiten',
          emptyTitle: 'Noch keine Sperrzeiten vorhanden.',
          columns: [
            {
              label: 'Sperrung',
              render: (row) =>
                h(
                  'div',
                  { class: 'table-primary' },
                  h('strong', { text: row.title }),
                  h('span', { text: row.reason || BLOCK_TYPES[row.block_type] }),
                ),
            },
            {
              label: 'Zeitraum',
              render: (row) => `${formatDate(row.start_date)} – ${formatDate(row.end_date)}`,
            },
            {
              label: 'Bereich',
              render: (row) =>
                statusBadge(row.boxes?.name ?? 'Alle Boxen', row.box_id ? 'neutral' : 'warning'),
            },
            { label: 'Typ', render: (row) => BLOCK_TYPES[row.block_type] ?? row.block_type },
          ],
          rowActions: (row) =>
            iconButton('close', 'Sperrzeit löschen', async () => {
              const confirmed = await confirmDialog({
                title: 'Sperrzeit löschen?',
                description: `${row.title} wird dauerhaft entfernt.`,
                confirmLabel: 'Löschen',
                danger: true,
              });
              if (!confirmed) return;
              await deleteBlock(row.id);
              showToast('Sperrzeit wurde gelöscht.');
              await render();
            }),
        }),
      ),
    );
  };
  await render();
  return adminShell(container);
}
