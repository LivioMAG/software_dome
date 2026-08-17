import { adminShell } from '../../app/appShell.js';
import { adjustLearnerCredits, getCreditOverview, resetAllCredits } from '../../api/creditsApi.js';
import { h, setBusy } from '../../utils/dom.js';
import { formatDateTime } from '../../utils/dates.js';
import { creditStatus, formatProfession, learnerName } from '../../utils/formatters.js';
import { normalizeError } from '../../utils/errors.js';
import {
  button,
  card,
  creditMeter,
  field,
  formMessage,
  iconButton,
  pageHeader,
  statCard,
  statusBadge,
} from '../../components/common/ui.js';
import { dataTable } from '../../components/common/dataTable.js';
import { confirmDialog, openDialog } from '../../components/common/dialog.js';
import { showToast } from '../../components/common/toast.js';

function adjustDialog(learner, onChanged) {
  const message = formMessage();
  const form = h(
    'form',
    { class: 'stack' },
    creditMeter(learner.credit_balance, { large: true, label: 'Aktueller Stand' }),
    field({
      label: 'Neuer Credit-Stand',
      name: 'new_balance',
      type: 'number',
      min: 0,
      max: 5,
      value: learner.credit_balance,
      required: true,
    }),
    field({
      label: 'Begründung',
      name: 'note',
      required: true,
      maxlength: 300,
      help: 'Die Korrektur wird unveränderbar protokolliert.',
    }),
    message,
  );
  openDialog({
    title: `Credits von ${learnerName(learner)} korrigieren`,
    content: form,
    actions: [
      { label: 'Abbrechen' },
      {
        label: 'Korrektur speichern',
        variant: 'primary',
        onClick: async (event, close) => {
          const submitButton = event.currentTarget;
          setBusy(submitButton, true, 'Speichern …');
          try {
            const values = Object.fromEntries(new FormData(form));
            await adjustLearnerCredits(learner.id, values.new_balance, values.note);
            close();
            showToast('Credit-Stand wurde korrigiert.');
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

export async function creditsPage() {
  const container = h('div', { class: 'admin-page' });
  const render = async () => {
    const { learners, transactions, resetRuns } = await getCreditOverview();
    const active = learners.filter((learner) => learner.active);
    const noUse = active.filter((learner) => learner.credit_balance === 5).length;
    const partial = active.filter(
      (learner) => learner.credit_balance > 0 && learner.credit_balance < 5,
    ).length;
    const allUsed = active.filter((learner) => learner.credit_balance === 0).length;
    const handleReset = async () => {
      const confirmed = await confirmDialog({
        title: 'Alle Credits auf 5 zurücksetzen?',
        description:
          'Alle aktiven Lernenden werden exakt auf 5 Credits gesetzt. Bestehende Buchungen und reservierte Kurstage bleiben bestehen.',
        confirmLabel: 'Credits zurücksetzen',
        danger: true,
      });
      if (!confirmed) return;
      try {
        const result = await resetAllCredits();
        showToast(`${result.learner_count ?? active.length} Credit-Stände wurden auf 5 gesetzt.`);
        await render();
      } catch (error) {
        showToast(normalizeError(error).message, 'error');
      }
    };
    container.replaceChildren(
      pageHeader(
        'Credits',
        'Verfügbare Kurstage prüfen und den jährlichen Reset protokolliert ausführen.',
        [
          button('Alle Credits auf 5 zurücksetzen', {
            icon: 'refresh',
            variant: 'danger',
            onClick: handleReset,
          }),
        ],
      ),
      h(
        'section',
        { class: 'stats-grid' },
        statCard('Noch nicht verwendet', noUse, { icon: 'credits' }),
        statCard('Teilweise verwendet', partial, { icon: 'credits', tone: 'accent' }),
        statCard('Vollständig verwendet', allUsed, { icon: 'credits' }),
        statCard(
          'Letzter Reset',
          resetRuns[0] ? formatDateTime(resetRuns[0].executed_at) : 'Noch nie',
          { icon: 'refresh' },
        ),
      ),
      card(
        { class: 'stack' },
        h('h2', { text: 'Aktuelle Credit-Stände' }),
        dataTable({
          rows: learners,
          rowLabel: 'Credit-Stände aller Lernenden',
          columns: [
            { label: 'Lernender', render: (row) => h('strong', { text: learnerName(row) }) },
            { label: 'Ausbildung', render: (row) => formatProfession(row.profession) },
            { label: 'Lehrjahr', render: (row) => `${row.apprenticeship_year}. Lehrjahr` },
            { label: 'Verwendet', render: (row) => String(5 - row.credit_balance) },
            { label: 'Verfügbar', render: (row) => creditMeter(row.credit_balance) },
            {
              label: 'Status',
              render: (row) => {
                const status = creditStatus(row.credit_balance);
                return statusBadge(status.label, status.tone);
              },
            },
          ],
          rowActions: (row) =>
            iconButton('edit', 'Credit-Stand korrigieren', () => adjustDialog(row, render)),
        }),
      ),
      card(
        { class: 'stack' },
        h('h2', { text: 'Letzte Credit-Transaktionen' }),
        dataTable({
          rows: transactions,
          rowLabel: 'Credit-Transaktionen',
          emptyTitle: 'Noch keine Credit-Transaktionen vorhanden.',
          columns: [
            { label: 'Zeitpunkt', render: (row) => formatDateTime(row.created_at) },
            { label: 'Lernender', render: (row) => learnerName(row.learners) },
            { label: 'Typ', render: (row) => row.transaction_type.replaceAll('_', ' ') },
            {
              label: 'Änderung',
              render: (row) =>
                statusBadge(
                  `${row.delta > 0 ? '+' : ''}${row.delta}`,
                  row.delta < 0 ? 'warning' : 'success',
                ),
            },
            { label: 'Stand', render: (row) => `${row.balance_before} → ${row.balance_after}` },
            { label: 'Notiz', render: (row) => row.note ?? '–' },
          ],
        }),
      ),
    );
  };
  await render();
  return adminShell(container);
}
