import { signInAdmin } from '../../auth/adminAuth.js';
import { publicShell } from '../../app/appShell.js';
import { navigate } from '../../app/router.js';
import { h, setBusy } from '../../utils/dom.js';
import { normalizeError } from '../../utils/errors.js';
import { button, card, field, formMessage } from '../../components/common/ui.js';

export function adminLoginPage() {
  const message = formMessage();
  const submit = button('Anmelden', {
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
        setBusy(submit, true, 'Anmeldung läuft …');
        message.classList.add('is-hidden');
        const values = Object.fromEntries(new FormData(event.currentTarget));
        try {
          await signInAdmin(values.email, values.password);
          navigate('/admin/dashboard');
        } catch (error) {
          message.textContent = normalizeError(error).message;
          message.classList.remove('is-hidden');
          setBusy(submit, false);
        }
      },
    },
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
    message,
    submit,
  );
  return publicShell(
    h(
      'div',
      { class: 'single-auth-page' },
      card(
        { class: 'single-auth-card stack' },
        h('span', { class: 'eyebrow', text: 'Administration' }),
        h('h1', { text: 'Willkommen zurück' }),
        h('p', { class: 'muted', text: 'Melde dich an, um MasterMag zu verwalten.' }),
        form,
      ),
    ),
    button('Zur Startseite', { href: '#/', variant: 'ghost', icon: 'arrowLeft' }),
  );
}
