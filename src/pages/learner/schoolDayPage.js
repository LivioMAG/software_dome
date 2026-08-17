import { learnerShell } from '../../app/appShell.js';
import { navigate } from '../../app/router.js';
import { store } from '../../app/store.js';
import { getLearnerToken, loadLearnerPortal } from '../../auth/learnerSession.js';
import { setLearnerSchoolDay } from '../../api/learnerApi.js';
import { SCHOOL_DAYS } from '../../constants/businessRules.js';
import { h, setBusy } from '../../utils/dom.js';
import { formatSchoolDay } from '../../utils/formatters.js';
import { normalizeError } from '../../utils/errors.js';
import { button, card, formMessage } from '../../components/common/ui.js';
import { icon } from '../../components/common/icons.js';

function schoolDayPicker(current, onSave) {
  let selected = current ?? null;
  const message = formMessage();
  const save = button('Schultag speichern', { disabled: !selected, trailingIcon: 'arrowRight' });
  const options = h(
    'div',
    { class: 'school-day-options' },
    SCHOOL_DAYS.map((day) =>
      h(
        'button',
        {
          type: 'button',
          class: `school-day-option${day.value === selected ? ' is-selected' : ''}`,
          'aria-pressed': day.value === selected,
          'on:click': () => {
            selected = day.value;
            [...options.children].forEach((element) => {
              const active = Number(element.dataset.value) === selected;
              element.classList.toggle('is-selected', active);
              element.setAttribute('aria-pressed', String(active));
            });
            save.disabled = false;
          },
          dataset: { value: day.value },
        },
        h('span', { text: day.label.slice(0, 2) }),
        h('strong', { text: day.label }),
        h('span', { class: 'school-day-option__check', html: icon('check', 17) }),
      ),
    ),
  );
  save.addEventListener('click', async () => {
    setBusy(save, true, 'Speichern …');
    try {
      await onSave(selected);
    } catch (error) {
      message.textContent = normalizeError(error).message;
      message.classList.remove('is-hidden');
      setBusy(save, false);
    }
  });
  return h('div', { class: 'stack' }, options, message, save);
}

export async function schoolDayPage() {
  const portal = await loadLearnerPortal();
  const learner = portal.learner;
  const content = h('div', { class: 'learner-page school-day-page' });

  const continueToCourses = (holidayMode) => {
    store.updateBooking({ holidayMode });
    navigate('/learner/courses');
  };

  const renderPicker = (isChange = false) => {
    content.replaceChildren(
      h(
        'header',
        { class: 'learner-title stack' },
        h('span', { class: 'step-label', text: 'Schritt 1 von 3' }),
        h('h1', { text: isChange ? 'Schultag ändern' : 'Wann hast du normalerweise Schule?' }),
        h('p', {
          text: 'Dein regulärer Schultag wird bei der Suche nach verfügbaren Kurstagen automatisch ausgeschlossen.',
        }),
      ),
      card(
        { class: 'stack school-day-card' },
        schoolDayPicker(learner.school_weekday, async (weekday) => {
          await setLearnerSchoolDay(getLearnerToken(), weekday);
          await loadLearnerPortal({ force: true });
          continueToCourses(false);
        }),
      ),
    );
  };

  if (!learner.school_weekday) {
    renderPicker();
  } else {
    content.append(
      h(
        'header',
        { class: 'learner-title stack' },
        h('span', { class: 'step-label', text: 'Schritt 1 von 3' }),
        h('h1', {
          text: `Ist dein Schultag weiterhin ${formatSchoolDay(learner.school_weekday)}?`,
        }),
        h('p', {
          text: 'Bestätige den Schultag oder wähle für diese Buchung den Schulferien-Modus.',
        }),
      ),
      card(
        { class: 'school-confirm-card stack' },
        h('span', {
          class: 'school-confirm-card__day',
          text: formatSchoolDay(learner.school_weekday),
        }),
        button('Ja, stimmt', {
          trailingIcon: 'arrowRight',
          onClick: () => continueToCourses(false),
        }),
        button('Schultag ändern', { variant: 'secondary', onClick: () => renderPicker(true) }),
        button('Ich buche während der Schulferien', {
          variant: 'ghost',
          onClick: () => continueToCourses(true),
        }),
        h('p', {
          class: 'holiday-note',
          text: 'Im Schulferien-Modus wird dein gespeicherter Schultag nur für diese Buchung ignoriert und nicht verändert.',
        }),
      ),
    );
  }
  return learnerShell(content, { hideNav: true });
}
