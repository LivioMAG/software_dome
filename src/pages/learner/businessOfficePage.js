import { learnerShell } from '../../app/appShell.js';
import { navigate } from '../../app/router.js';
import { listPublicBusinessOffices } from '../../api/businessOfficesApi.js';
import { setLearnerBusinessOffice } from '../../api/learnerApi.js';
import { getLearnerToken, loadLearnerPortal } from '../../auth/learnerSession.js';
import { h, setBusy } from '../../utils/dom.js';
import { button, card, formMessage, pageHeader, selectField } from '../../components/common/ui.js';
import { normalizeError } from '../../utils/errors.js';

export async function businessOfficePage() {
  const portal = await loadLearnerPortal();
  if (portal.learner.business_office_id) {
    navigate('/learner/school-day');
    return h('div');
  }
  const offices = await listPublicBusinessOffices();
  const message = formMessage();
  const submit = button('Geschäftsstelle speichern', {
    type: 'submit',
    class: 'full-width',
    trailingIcon: 'arrowRight',
  });
  const form = h(
    'form',
    {
      class: 'stack',
      'on:submit': async (event) => {
        event.preventDefault();
        setBusy(submit, true, 'Speichern …');
        try {
          await setLearnerBusinessOffice(
            getLearnerToken(),
            new FormData(event.currentTarget).get('office_id'),
          );
          await loadLearnerPortal({ force: true });
          navigate('/learner/school-day');
        } catch (error) {
          message.textContent = normalizeError(error).message;
          message.classList.remove('is-hidden');
          setBusy(submit, false);
        }
      },
    },
    selectField({
      label: 'Geschäftsstelle',
      name: 'office_id',
      required: true,
      options: [
        { value: '', label: 'Bitte auswählen' },
        ...offices.map((o) => ({ value: o.id, label: o.name })),
      ],
    }),
    message,
    submit,
  );
  return learnerShell(
    h(
      'div',
      { class: 'learner-page' },
      pageHeader(
        'Geschäftsstelle auswählen',
        'Diese Auswahl wird deinem Konto dauerhaft hinterlegt.',
      ),
      card({ class: 'stack single-auth-card' }, form),
    ),
    { hideNav: true },
  );
}
