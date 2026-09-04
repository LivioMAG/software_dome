import { adminShell } from '../../app/appShell.js';
import {
  deleteBusinessOffice,
  listBusinessOffices,
  saveBusinessOffice,
} from '../../api/businessOfficesApi.js';
import { h, setBusy } from '../../utils/dom.js';
import { button, card, field, formMessage, pageHeader } from '../../components/common/ui.js';
import { dataTable } from '../../components/common/dataTable.js';
import { confirmDialog, openDialog } from '../../components/common/dialog.js';
import { normalizeError } from '../../utils/errors.js';
import { showToast } from '../../components/common/toast.js';

function officeDialog(office, refresh) {
  const message = formMessage();
  let closeDialog;
  const form = h(
    'form',
    {
      id: 'business-office-form',
      class: 'stack',
      'on:submit': async (event) => {
        event.preventDefault();
        const submit = event.submitter;
        setBusy(submit, true, 'Speichern …');
        message.classList.add('is-hidden');
        try {
          await saveBusinessOffice(
            Object.fromEntries(new FormData(event.currentTarget)),
            office?.id,
          );
          closeDialog();
          showToast('Geschäftsstelle gespeichert.');
          await refresh();
        } catch (error) {
          message.textContent = normalizeError(error).message;
          message.classList.remove('is-hidden');
          setBusy(submit, false);
        }
      },
    },
    field({
      label: 'Geschäftsstelle',
      name: 'name',
      value: office?.name,
      required: true,
      maxlength: 160,
    }),
    h(
      'div',
      { class: 'form-grid' },
      field({
        label: 'Vorname GL',
        name: 'gl_first_name',
        value: office?.gl_first_name,
        required: true,
      }),
      field({
        label: 'Nachname GL',
        name: 'gl_last_name',
        value: office?.gl_last_name,
        required: true,
      }),
      field({
        label: 'E-Mail GL',
        name: 'gl_email',
        type: 'email',
        value: office?.gl_email,
        required: true,
      }),
      field({
        label: 'Telefon GL',
        name: 'gl_phone',
        type: 'tel',
        value: office?.gl_phone?.replace(/^\+41/, ''),
        required: true,
        prefix: '+41',
      }),
    ),
    message,
  );
  ({ close: closeDialog } = openDialog({
    title: office ? 'Geschäftsstelle bearbeiten' : 'Geschäftsstelle erfassen',
    content: form,
    actions: [
      { label: 'Abbrechen' },
      {
        label: 'Speichern',
        variant: 'primary',
        type: 'submit',
        form: 'business-office-form',
      },
    ],
  }));
}

export async function businessOfficesPage() {
  const container = h('div', { class: 'admin-page' });
  const render = async () => {
    const offices = await listBusinessOffices();
    const table = dataTable({
      rows: offices,
      rowLabel: 'Geschäftsstellen',
      emptyTitle: 'Noch keine Geschäftsstelle vorhanden.',
      columns: [
        { label: 'Geschäftsstelle', render: (row) => row.name },
        { label: 'GL', render: (row) => `${row.gl_first_name} ${row.gl_last_name}` },
        {
          label: 'Kontakt',
          render: (row) =>
            h(
              'div',
              { class: 'table-primary' },
              h('span', { text: row.gl_email }),
              h('span', { text: row.gl_phone }),
            ),
        },
      ],
      rowActions: (row) =>
        h(
          'div',
          { class: 'cluster' },
          button('Bearbeiten', { variant: 'ghost', onClick: () => officeDialog(row, render) }),
          button('Löschen', {
            variant: 'ghost',
            onClick: async () => {
              if (
                await confirmDialog({
                  title: 'Geschäftsstelle löschen?',
                  description: 'Bereits zugewiesene Lernende verlieren die Zuordnung.',
                  confirmLabel: 'Löschen',
                  danger: true,
                })
              ) {
                await deleteBusinessOffice(row.id);
                await render();
              }
            },
          }),
        ),
    });
    container.replaceChildren(
      pageHeader('Geschäftsstellen', 'Geschäftsleitung (GL) und Kontaktdaten verwalten.', [
        button('Geschäftsstelle erfassen', {
          icon: 'plus',
          onClick: () => officeDialog(null, render),
        }),
      ]),
      card({}, table),
    );
  };
  await render();
  return adminShell(container);
}
