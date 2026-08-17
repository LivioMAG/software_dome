import { adminShell } from '../../app/appShell.js';
import { listLearners, saveLearner, setLearnerActive } from '../../api/learnersApi.js';
import { h, setBusy } from '../../utils/dom.js';
import { formatDateTime } from '../../utils/dates.js';
import { formatProfession, formatSchoolDay, learnerName } from '../../utils/formatters.js';
import { PROFESSIONS, SCHOOL_DAYS } from '../../constants/businessRules.js';
import { normalizeError } from '../../utils/errors.js';
import {
  button,
  card,
  creditMeter,
  field,
  formMessage,
  iconButton,
  pageHeader,
  selectField,
  statusBadge,
} from '../../components/common/ui.js';
import { dataTable } from '../../components/common/dataTable.js';
import { openDialog, confirmDialog } from '../../components/common/dialog.js';
import { showToast } from '../../components/common/toast.js';

function learnerFormDialog(learner, onSaved) {
  const message = formMessage();
  const form = h(
    'form',
    { class: 'stack', id: 'learner-form' },
    h(
      'div',
      { class: 'form-grid' },
      field({ label: 'Vorname', name: 'first_name', value: learner?.first_name, required: true }),
      field({ label: 'Nachname', name: 'last_name', value: learner?.last_name, required: true }),
      field({
        label: 'E-Mail-Adresse',
        name: 'email',
        type: 'email',
        value: learner?.email,
        required: true,
      }),
      field({
        label: 'Geburtsdatum',
        name: 'birth_date',
        type: 'date',
        value: learner?.birth_date,
        required: true,
      }),
      selectField({
        label: 'Ausbildung',
        name: 'profession',
        value: learner?.profession ?? 'elektroinstallateur',
        required: true,
        options: Object.entries(PROFESSIONS).map(([value, label]) => ({ value, label })),
      }),
      selectField({
        label: 'Lehrjahr',
        name: 'apprenticeship_year',
        value: learner?.apprenticeship_year ?? 1,
        required: true,
        options: [1, 2, 3, 4].map((value) => ({ value, label: `${value}. Lehrjahr` })),
      }),
      selectField({
        label: 'Regulärer Schultag',
        name: 'school_weekday',
        value: learner?.school_weekday ?? '',
        options: [{ value: '', label: 'Noch nicht festgelegt' }, ...SCHOOL_DAYS],
      }),
      selectField({
        label: 'Status',
        name: 'active',
        value: learner?.active === false ? 'false' : 'true',
        options: [
          { value: 'true', label: 'Aktiv' },
          { value: 'false', label: 'Deaktiviert' },
        ],
      }),
    ),
    message,
  );
  const dialog = openDialog({
    title: learner ? `${learnerName(learner)} bearbeiten` : 'Lernenden erstellen',
    description: 'Stammdaten, Ausbildung und regulären Schultag pflegen.',
    content: form,
    size: 'large',
    actions: [
      { label: 'Abbrechen' },
      {
        label: learner ? 'Änderungen speichern' : 'Lernenden erstellen',
        variant: 'primary',
        onClick: async (event, close) => {
          const submitButton = event.currentTarget;
          setBusy(submitButton, true, 'Speichern …');
          message.classList.add('is-hidden');
          try {
            const values = Object.fromEntries(new FormData(form));
            values.active = values.active === 'true';
            await saveLearner(values, learner?.id);
            close();
            showToast(learner ? 'Lernender wurde aktualisiert.' : 'Lernender wurde erstellt.');
            await onSaved();
          } catch (error) {
            message.textContent = normalizeError(error).message;
            message.classList.remove('is-hidden');
            setBusy(submitButton, false);
          }
        },
      },
    ],
  });
  return dialog;
}

export async function learnersPage() {
  const container = h('div', { class: 'admin-page' });

  const render = async () => {
    const learners = await listLearners();
    const table = dataTable({
      rowLabel: 'Liste der Lernenden',
      rows: learners,
      emptyTitle: 'Noch keine Lernenden vorhanden.',
      columns: [
        {
          label: 'Lernender',
          render: (row) =>
            h(
              'div',
              { class: 'table-primary' },
              h('strong', { text: learnerName(row) }),
              h('span', { text: row.email }),
            ),
        },
        { label: 'Ausbildung', render: (row) => formatProfession(row.profession) },
        { label: 'Lehrjahr', render: (row) => `${row.apprenticeship_year}. Lehrjahr` },
        { label: 'Schultag', render: (row) => formatSchoolDay(row.school_weekday) },
        { label: 'Credits', render: (row) => creditMeter(row.credit_balance) },
        {
          label: 'Status',
          render: (row) =>
            statusBadge(row.active ? 'Aktiv' : 'Deaktiviert', row.active ? 'success' : 'neutral'),
        },
      ],
      rowActions: (row) =>
        h(
          'div',
          { class: 'cluster' },
          iconButton('edit', 'Bearbeiten', () => learnerFormDialog(row, render)),
          iconButton(
            row.active ? 'close' : 'check',
            row.active ? 'Deaktivieren' : 'Aktivieren',
            async () => {
              const confirmed = await confirmDialog({
                title: row.active ? 'Lernenden deaktivieren?' : 'Lernenden aktivieren?',
                description: row.active
                  ? `${learnerName(row)} kann sich danach nicht mehr anmelden. Die Historie bleibt erhalten.`
                  : `${learnerName(row)} erhält wieder Zugang zum Lernenden-Portal.`,
                confirmLabel: row.active ? 'Deaktivieren' : 'Aktivieren',
                danger: row.active,
              });
              if (!confirmed) return;
              await setLearnerActive(row.id, !row.active);
              showToast(row.active ? 'Lernender wurde deaktiviert.' : 'Lernender wurde aktiviert.');
              await render();
            },
          ),
        ),
    });
    container.replaceChildren(
      pageHeader('Lernende', 'Stammdaten, Schultage und verfügbare Kurstage verwalten.', [
        button('Lernenden erstellen', {
          icon: 'plus',
          onClick: () => learnerFormDialog(null, render),
        }),
      ]),
      h(
        'section',
        { class: 'list-summary cluster' },
        statusBadge(`${learners.filter((row) => row.active).length} aktiv`, 'success'),
        statusBadge(`${learners.filter((row) => !row.active).length} deaktiviert`),
        h('span', { class: 'muted', text: `Stand: ${formatDateTime(new Date().toISOString())}` }),
      ),
      card({ class: 'stack' }, table),
    );
  };
  await render();
  return adminShell(container);
}
