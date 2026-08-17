import { adminShell } from '../../app/appShell.js';
import { getDashboardData } from '../../api/adminApi.js';
import { h } from '../../utils/dom.js';
import { formatDateTime } from '../../utils/dates.js';
import { creditStatus, formatProfession, learnerName } from '../../utils/formatters.js';
import {
  card,
  creditMeter,
  pageHeader,
  sectionHeading,
  statCard,
  statusBadge,
} from '../../components/common/ui.js';
import { dataTable } from '../../components/common/dataTable.js';

export async function dashboardPage() {
  const { metrics, learners, lastReset } = await getDashboardData();
  const statItems = [
    ['Aktive Lernende', metrics.activeLearners, 'users', 'accent'],
    ['Aktive Kurse', metrics.activeCourses, 'course'],
    ['Aktive Boxen', metrics.activeBoxes, 'box'],
    ['Heutige Belegungen', metrics.occupiedToday, 'calendar', 'accent'],
    ['Buchungen diese Woche', metrics.bookingsThisWeek, 'booking'],
    ['Freie Boxen heute', metrics.freeToday, 'box'],
    ['Volle 5 Credits', metrics.fullCredits, 'credits'],
    ['Ohne Credits', metrics.noCredits, 'credits', 'accent'],
  ];
  const table = dataTable({
    rowLabel: 'Credit-Übersicht der Lernenden',
    rows: learners,
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
  });
  return adminShell(
    h(
      'div',
      { class: 'admin-page' },
      pageHeader('Übersicht', 'Alle wichtigen Kennzahlen und Credit-Stände auf einen Blick.'),
      h(
        'section',
        { class: 'stats-grid', 'aria-label': 'Kennzahlen' },
        statItems.map(([label, value, iconName, tone]) =>
          statCard(label, value, { icon: iconName, tone }),
        ),
      ),
      card(
        { class: 'stack' },
        sectionHeading(
          'Credit-Übersicht',
          `${metrics.partialCredits} Lernende haben bereits einen Teil ihrer Kurstage verwendet.`,
          h(
            'span',
            { class: 'last-reset' },
            h('small', { text: 'Letzter Reset' }),
            h('strong', { text: lastReset ? formatDateTime(lastReset.executed_at) : 'Noch nie' }),
          ),
        ),
        table,
      ),
    ),
  );
}
