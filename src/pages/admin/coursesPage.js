import { adminShell } from '../../app/appShell.js';
import { listCourses, saveCourse, setCourseActive } from '../../api/coursesApi.js';
import { h, setBusy } from '../../utils/dom.js';
import { formatProfessionScope, pluralizeDays } from '../../utils/formatters.js';
import { PROFESSION_SCOPES } from '../../constants/businessRules.js';
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

function courseDialog(course, onSaved) {
  const message = formMessage();
  const form = h(
    'form',
    { class: 'stack' },
    field({
      label: 'Kurstitel',
      name: 'title',
      value: course?.title,
      required: true,
      maxlength: 160,
    }),
    textareaField({
      label: 'Kurzbeschreibung',
      name: 'short_description',
      value: course?.short_description,
      required: true,
      maxlength: 600,
    }),
    h(
      'div',
      { class: 'form-grid' },
      selectField({
        label: 'Kursdauer',
        name: 'duration_days',
        value: course?.duration_days ?? 1,
        options: [1, 2, 3, 4, 5].map((value) => ({ value, label: pluralizeDays(value) })),
      }),
      selectField({
        label: 'Geeignet ab Lehrjahr',
        name: 'minimum_apprenticeship_year',
        value: course?.minimum_apprenticeship_year ?? 1,
        options: [1, 2, 3, 4].map((value) => ({ value, label: `Ab ${value}. Lehrjahr` })),
      }),
      selectField({
        label: 'Zielgruppe',
        name: 'profession_scope',
        value: course?.profession_scope ?? 'both',
        options: Object.entries(PROFESSION_SCOPES).map(([value, label]) => ({ value, label })),
      }),
      selectField({
        label: 'Status',
        name: 'active',
        value: course?.active === false ? 'false' : 'true',
        options: [
          { value: 'true', label: 'Aktiv' },
          { value: 'false', label: 'Archiviert' },
        ],
      }),
    ),
    message,
  );
  openDialog({
    title: course ? 'Kurs bearbeiten' : 'Kurs erstellen',
    description: 'Dauer, Eignung und Zielgruppe definieren die Sichtbarkeit für Lernende.',
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
            await saveCourse(values, course?.id);
            close();
            showToast(course ? 'Kurs wurde aktualisiert.' : 'Kurs wurde erstellt.');
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

export async function coursesPage() {
  const container = h('div', { class: 'admin-page' });
  const render = async () => {
    const courses = await listCourses();
    container.replaceChildren(
      pageHeader('Kurse', 'Wiederverwendbare Kursvorlagen für beide Ausbildungen.', [
        button('Kurs erstellen', { icon: 'plus', onClick: () => courseDialog(null, render) }),
      ]),
      card(
        { class: 'stack' },
        dataTable({
          rows: courses,
          rowLabel: 'Liste der Kurse',
          emptyTitle: 'Noch keine Kurse vorhanden.',
          columns: [
            {
              label: 'Kurs',
              render: (row) =>
                h(
                  'div',
                  { class: 'table-primary' },
                  h('strong', { text: row.title }),
                  h('span', { text: row.short_description }),
                ),
            },
            { label: 'Dauer', render: (row) => pluralizeDays(row.duration_days) },
            {
              label: 'Mindestlehrjahr',
              render: (row) => `Ab ${row.minimum_apprenticeship_year}. Lehrjahr`,
            },
            { label: 'Zielgruppe', render: (row) => formatProfessionScope(row.profession_scope) },
            {
              label: 'Status',
              render: (row) =>
                statusBadge(
                  row.active ? 'Aktiv' : 'Archiviert',
                  row.active ? 'success' : 'neutral',
                ),
            },
          ],
          rowActions: (row) =>
            h(
              'div',
              { class: 'cluster' },
              iconButton('edit', 'Kurs bearbeiten', () => courseDialog(row, render)),
              iconButton(
                row.active ? 'close' : 'check',
                row.active ? 'Archivieren' : 'Aktivieren',
                async () => {
                  const confirmed = await confirmDialog({
                    title: row.active ? 'Kurs archivieren?' : 'Kurs aktivieren?',
                    description: row.active
                      ? 'Bestehende Buchungen bleiben unverändert. Der Kurs wird Lernenden nicht mehr angeboten.'
                      : 'Der Kurs wird berechtigten Lernenden wieder angeboten.',
                    confirmLabel: row.active ? 'Archivieren' : 'Aktivieren',
                    danger: row.active,
                  });
                  if (!confirmed) return;
                  await setCourseActive(row.id, !row.active);
                  showToast(row.active ? 'Kurs wurde archiviert.' : 'Kurs wurde aktiviert.');
                  await render();
                },
              ),
            ),
        }),
      ),
    );
  };
  await render();
  return adminShell(container);
}
