import { publicShell } from '../../app/appShell.js';
import { navigate } from '../../app/router.js';
import { signInLearner } from '../../auth/learnerSession.js';
import { h, setBusy } from '../../utils/dom.js';
import { normalizeError } from '../../utils/errors.js';
import { button, card, field, formMessage } from '../../components/common/ui.js';

export function learnerLoginPage() {
  const message = formMessage();
  const submit = button('Weiter zur Kursbuchung', {
    type: 'submit',
    trailingIcon: 'arrowRight',
    class: 'full-width',
  });
  const form = h(
    'form',
    {
      class: 'stack',
      'on:submit': async (event) => {
        event.preventDefault();
        const submitButton = submit;
        setBusy(submitButton, true, 'Angaben prüfen …');
        message.classList.add('is-hidden');
        try {
          const values = Object.fromEntries(new FormData(event.currentTarget));
          const portal = await signInLearner(values.email, values.birth_date);
          navigate(
            portal.learner.business_office_id ? '/learner/school-day' : '/learner/business-office',
          );
        } catch (error) {
          message.textContent = normalizeError(
            error,
            'Die Angaben konnten nicht bestätigt werden.',
          ).message;
          message.classList.remove('is-hidden');
          setBusy(submitButton, false);
        }
      },
    },
    field({
      label: 'E-Mail-Adresse',
      name: 'email',
      type: 'email',
      autocomplete: 'email',
      required: true,
    }),
    field({
      label: 'Geburtsdatum',
      name: 'birth_date',
      type: 'date',
      autocomplete: 'bday',
      required: true,
    }),
    message,
    submit,
  );
  return publicShell(
    h(
      'div',
      { class: 'single-auth-page' },
      card(
        { class: 'single-auth-card stack' },
        h('span', { class: 'eyebrow', text: 'Lernenden-Portal' }),
        h('h1', { text: 'Kurs buchen' }),
        h('p', {
          class: 'muted',
          text: 'Bestätige deine Angaben, um passende Kurse und freie Boxen zu sehen.',
        }),
        form,
        h('small', {
          class: 'privacy-note',
          text: 'E-Mail-Adresse und Geburtsdatum werden nicht dauerhaft im Browser gespeichert.',
        }),
      ),
    ),
    button('Zur Startseite', { href: '#/', variant: 'ghost', icon: 'arrowLeft' }),
  );
}
