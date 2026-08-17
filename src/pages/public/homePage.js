import { signInAdmin } from '../../auth/adminAuth.js';
import { signInLearner } from '../../auth/learnerSession.js';
import { publicShell } from '../../app/appShell.js';
import { navigate } from '../../app/router.js';
import { h, setBusy } from '../../utils/dom.js';
import { normalizeError } from '../../utils/errors.js';
import { button, card, field, formMessage } from '../../components/common/ui.js';
import { icon } from '../../components/common/icons.js';

function accessCard({
  eyebrow,
  title,
  description,
  iconName,
  fields,
  actionLabel,
  onSubmit,
  footer,
}) {
  const message = formMessage();
  const submit = button(actionLabel, {
    type: 'submit',
    trailingIcon: 'arrowRight',
    class: 'full-width',
  });
  const form = h(
    'form',
    {
      class: 'access-card__form stack',
      'on:submit': async (event) => {
        event.preventDefault();
        message.classList.add('is-hidden');
        setBusy(submit, true, 'Bitte warten …');
        try {
          const values = Object.fromEntries(new FormData(event.currentTarget));
          await onSubmit(values);
        } catch (error) {
          message.textContent = normalizeError(error).message;
          message.classList.remove('is-hidden');
          setBusy(submit, false);
        }
      },
    },
    fields,
    message,
    submit,
  );

  return card(
    { class: 'access-card' },
    h('div', { class: 'access-card__glow', 'aria-hidden': 'true' }),
    h(
      'header',
      { class: 'access-card__header' },
      h('span', { class: 'access-card__icon', html: icon(iconName, 23) }),
      h('span', { class: 'eyebrow', text: eyebrow }),
      h('h2', { text: title }),
      h('p', { text: description }),
    ),
    form,
    footer ? h('footer', { class: 'access-card__footer', text: footer }) : null,
  );
}

export function homePage() {
  const content = h(
    'div',
    { class: 'home-page' },
    h(
      'section',
      { class: 'home-hero' },
      h('span', { class: 'hero-kicker', text: 'Praktische Ausbildung · einfach geplant' }),
      h('h1', {}, 'Kurse planen. ', h('em', { text: 'Praxis erleben.' })),
      h('p', {
        text: 'MasterMag verbindet Lernende, Kurse und Arbeitsboxen in einer klaren, sicheren Planung.',
      }),
    ),
    h(
      'section',
      { class: 'access-grid', 'aria-label': 'Zugänge' },
      accessCard({
        eyebrow: 'Für Lernende',
        title: 'Kurs buchen',
        description:
          'Melde dich mit deiner hinterlegten E-Mail-Adresse und deinem Geburtsdatum an.',
        iconName: 'course',
        fields: [
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
        ],
        actionLabel: 'Weiter zur Kursbuchung',
        onSubmit: async ({ email, birth_date }) => {
          await signInLearner(email, birth_date);
          navigate('/learner/school-day');
        },
        footer: 'Deine Angaben werden nicht dauerhaft in diesem Browser gespeichert.',
      }),
      accessCard({
        eyebrow: 'Administration',
        title: 'Admin anmelden',
        description: 'Verwalte Planung, Lernende, Kurse, Boxen und verfügbare Kurstage.',
        iconName: 'lock',
        fields: [
          field({
            label: 'E-Mail-Adresse',
            name: 'email',
            type: 'email',
            autocomplete: 'username',
            required: true,
          }),
          field({
            label: 'Passwort',
            name: 'password',
            type: 'password',
            autocomplete: 'current-password',
            required: true,
          }),
        ],
        actionLabel: 'Sicher anmelden',
        onSubmit: async ({ email, password }) => {
          await signInAdmin(email, password);
          navigate('/admin/dashboard');
        },
        footer: 'Geschützter Zugang für die verantwortliche Administration.',
      }),
    ),
  );
  return publicShell(content);
}
