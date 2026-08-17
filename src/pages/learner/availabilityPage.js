import { learnerShell } from '../../app/appShell.js';
import { navigate } from '../../app/router.js';
import { store } from '../../app/store.js';
import { getLearnerToken } from '../../auth/learnerSession.js';
import { getCourseBoxAvailability } from '../../api/learnerApi.js';
import { h, setBusy } from '../../utils/dom.js';
import { formatDate, formatWeekday, todayIso } from '../../utils/dates.js';
import { normalizeError } from '../../utils/errors.js';
import {
  button,
  card,
  emptyState,
  errorState,
  field,
  formMessage,
  statusBadge,
} from '../../components/common/ui.js';
import { icon } from '../../components/common/icons.js';

export async function availabilityPage() {
  const draft = store.get().bookingDraft;
  if (!draft.course) {
    navigate('/learner/courses');
    return h('div');
  }
  const container = h('div', { class: 'learner-page' });
  let selectedBox = draft.box;
  let selectedDates = [...draft.dates];
  let availability = draft.availability;
  let startDate = draft.startDate ?? todayIso();

  const loadAvailability = async (submitButton) => {
    setBusy(submitButton, true, 'Verfügbarkeit prüfen …');
    try {
      availability = await getCourseBoxAvailability(
        getLearnerToken(),
        draft.course.id,
        startDate,
        draft.holidayMode,
      );
      selectedBox = null;
      selectedDates = [];
      store.updateBooking({ startDate, availability, box: null, dates: [] });
      render();
    } catch (error) {
      container.replaceChildren(errorState(normalizeError(error).message, () => render()));
    }
  };

  const renderDatePicker = () => {
    const boxAvailability = availability.boxes.find((box) => box.id === selectedBox?.id);
    const required = availability.required_days;
    const selectionText = `${selectedDates.length} von ${required} ${required === 1 ? 'Tag' : 'Tagen'} ausgewählt`;
    return h(
      'section',
      { class: 'stack date-selection' },
      h(
        'div',
        { class: 'split' },
        h(
          'div',
          {},
          h('h2', { text: 'Kurstage auswählen' }),
          h('p', { class: 'muted', text: `Alle Tage finden in ${selectedBox.name} statt.` }),
        ),
        button('Box wechseln', {
          variant: 'ghost',
          onClick: () => {
            selectedBox = null;
            selectedDates = [];
            store.updateBooking({ box: null, dates: [] });
            render();
          },
        }),
      ),
      h(
        'div',
        { class: 'selection-progress' },
        h('strong', { text: selectionText }),
        h(
          'div',
          {},
          h('span', { style: { width: `${(selectedDates.length / required) * 100}%` } }),
        ),
      ),
      h(
        'div',
        { class: 'date-option-grid' },
        boxAvailability.dates.map((date) => {
          const selected = selectedDates.includes(date);
          const atLimit = selectedDates.length >= required && !selected;
          return h(
            'button',
            {
              type: 'button',
              class: `date-option${selected ? ' is-selected' : ''}`,
              disabled: atLimit,
              'aria-pressed': selected,
              'on:click': () => {
                selectedDates = selected
                  ? selectedDates.filter((item) => item !== date)
                  : [...selectedDates, date].sort();
                store.updateBooking({ dates: selectedDates });
                render();
              },
            },
            h('span', { text: formatWeekday(date, 'short') }),
            h('strong', { text: formatDate(date, { short: true }) }),
            h('small', { text: selected ? 'Ausgewählt' : 'Verfügbar' }),
          );
        }),
      ),
      h(
        'div',
        { class: 'mobile-action-bar' },
        button('Weiter zur Zusammenfassung', {
          class: 'full-width',
          trailingIcon: 'arrowRight',
          disabled: selectedDates.length !== required,
          onClick: () => navigate('/learner/booking-review'),
        }),
      ),
    );
  };

  const render = () => {
    const message = formMessage();
    const checkButton = button('Passende Boxen suchen', {
      type: 'submit',
      trailingIcon: 'arrowRight',
    });
    const form = h(
      'form',
      {
        class: 'availability-search',
        'on:submit': async (event) => {
          event.preventDefault();
          startDate = new FormData(event.currentTarget).get('start_date');
          await loadAvailability(checkButton);
        },
      },
      field({
        label: 'Frühestes gewünschtes Kursdatum',
        name: 'start_date',
        type: 'date',
        value: startDate,
        min: todayIso(),
        required: true,
        help: 'Wir prüfen dieses Datum und die folgenden sechs Kalendertage.',
      }),
      checkButton,
      message,
    );
    container.replaceChildren(
      h(
        'header',
        { class: 'learner-title stack' },
        h('span', { class: 'step-label', text: 'Schritt 3 von 3' }),
        h('h1', { text: draft.course.title }),
        h('p', {
          text: `${draft.course.duration_days} einzelne Kurstage in derselben Arbeitsbox auswählen.`,
        }),
      ),
      card({ class: 'stack availability-card' }, form),
    );
    if (!availability) return;
    if (!availability.boxes.length) {
      container.append(
        card(
          {},
          emptyState(
            'Keine passende Box gefunden',
            'Für diesen Kurs sind im gewählten Zeitraum keine passenden Boxen verfügbar. Wähle ein anderes Startdatum.',
          ),
        ),
      );
      return;
    }
    if (!selectedBox) {
      container.append(
        h(
          'section',
          { class: 'stack' },
          h(
            'div',
            { class: 'section-heading' },
            h(
              'div',
              {},
              h('h2', { text: 'Arbeitsbox auswählen' }),
              h('p', { text: 'Jede angezeigte Box besitzt genügend gültige, freie Kurstage.' }),
            ),
            statusBadge(`${availability.boxes.length} verfügbar`, 'success'),
          ),
          h(
            'div',
            { class: 'learner-box-grid' },
            availability.boxes.map((box) =>
              h(
                'button',
                {
                  type: 'button',
                  class: 'learner-box-card',
                  'on:click': () => {
                    selectedBox = box;
                    selectedDates = [];
                    store.updateBooking({ box, dates: [] });
                    render();
                  },
                },
                h('span', { class: 'learner-box-card__icon', html: icon('box', 23) }),
                h('strong', { text: box.name }),
                h('small', { text: `${box.dates.length} gültige Tage verfügbar` }),
                h('span', { class: 'learner-box-card__arrow', html: icon('arrowRight', 18) }),
              ),
            ),
          ),
        ),
      );
    } else {
      container.append(card({ class: 'stack' }, renderDatePicker()));
    }
  };

  render();
  return learnerShell(container, { active: 'courses', hideNav: true });
}
