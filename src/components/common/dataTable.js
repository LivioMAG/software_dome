import { h } from '../../utils/dom.js';
import { emptyState } from './ui.js';

export function dataTable({
  columns,
  rows,
  emptyTitle = 'Keine Einträge vorhanden.',
  rowActions,
  rowLabel,
}) {
  if (!rows?.length) return emptyState(emptyTitle);
  const table = h(
    'table',
    { class: 'data-table' },
    h(
      'thead',
      {},
      h(
        'tr',
        {},
        columns.map((column) => h('th', { scope: 'col', text: column.label })),
        rowActions
          ? h('th', { scope: 'col', class: 'data-table__actions', text: 'Aktionen' })
          : null,
      ),
    ),
    h(
      'tbody',
      {},
      rows.map((row) =>
        h(
          'tr',
          {},
          columns.map((column) => {
            const value = column.render ? column.render(row) : row[column.key];
            return h('td', { dataset: { label: column.label } }, value ?? '–');
          }),
          rowActions
            ? h(
                'td',
                { class: 'data-table__actions', dataset: { label: 'Aktionen' } },
                rowActions(row),
              )
            : null,
        ),
      ),
    ),
  );
  return h(
    'div',
    {
      class: 'table-wrap',
      role: 'region',
      'aria-label': rowLabel ?? 'Datentabelle',
      tabindex: '0',
    },
    table,
  );
}
