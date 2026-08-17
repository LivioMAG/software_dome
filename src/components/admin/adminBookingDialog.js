import { listLearners } from '../../api/learnersApi.js';
import { listCourses } from '../../api/coursesApi.js';
import { listBoxes } from '../../api/boxesApi.js';
import { adminCreateBooking, adminMoveBooking } from '../../api/bookingApi.js';
import { h, setBusy } from '../../utils/dom.js';
import { addDays, formatDate, todayIso } from '../../utils/dates.js';
import { learnerName, pluralizeDays } from '../../utils/formatters.js';
import { normalizeError } from '../../utils/errors.js';
import { field, formMessage, selectField } from '../common/ui.js';
import { openDialog } from '../common/dialog.js';
import { showToast } from '../common/toast.js';

function dateInputList(count, initialDates = []) {
  return h(
    'div',
    { class: 'booking-date-inputs form-grid' },
    Array.from({ length: count }, (_, index) =>
      field({
        label: `Kurstag ${index + 1}`,
        name: `booking_date_${index}`,
        type: 'date',
        min: todayIso(),
        value:
          initialDates[index] ??
          (index ? addDays(initialDates[0] ?? todayIso(), index) : (initialDates[0] ?? '')),
        required: true,
      }),
    ),
  );
}

export async function openAdminBookingDialog({ booking = null, prefill = {}, onSaved }) {
  const isMove = Boolean(booking);
  const [learners, courses, boxes] = await Promise.all([
    listLearners({ active: true }),
    listCourses({ active: true }),
    listBoxes({ active: true }),
  ]);
  const initialDates = booking
    ? booking.booking_days
        .filter((day) => day.is_active)
        .map((day) => day.booking_date)
        .sort()
    : prefill.date
      ? [prefill.date]
      : [];
  const initialCourse = booking
    ? {
        id: booking.course_id,
        title: booking.course_title_snapshot,
        duration_days: booking.course_duration_snapshot,
      }
    : (courses.find((course) => course.id === prefill.courseId) ?? courses[0]);
  const datesHost = h('div', {}, dateInputList(initialCourse?.duration_days ?? 1, initialDates));
  const message = formMessage();
  const form = h('form', { class: 'stack' });

  if (isMove) {
    form.append(
      h(
        'div',
        { class: 'booking-context-grid' },
        h(
          'div',
          {},
          h('span', { text: 'Lernender' }),
          h('strong', { text: learnerName(booking.learners) }),
        ),
        h(
          'div',
          {},
          h('span', { text: 'Kurs' }),
          h('strong', { text: booking.course_title_snapshot }),
        ),
        h(
          'div',
          {},
          h('span', { text: 'Dauer' }),
          h('strong', { text: pluralizeDays(booking.course_duration_snapshot) }),
        ),
      ),
    );
  } else {
    const courseSelect = selectField({
      label: 'Kurs',
      name: 'course_id',
      value: initialCourse?.id,
      required: true,
      options: courses.map((course) => ({
        value: course.id,
        label: `${course.title} · ${pluralizeDays(course.duration_days)}`,
      })),
    });
    courseSelect.querySelector('select').addEventListener('change', (event) => {
      const course = courses.find((item) => item.id === event.target.value);
      datesHost.replaceChildren(dateInputList(course?.duration_days ?? 1, initialDates));
    });
    form.append(
      h(
        'div',
        { class: 'form-grid' },
        selectField({
          label: 'Lernender',
          name: 'learner_id',
          value: prefill.learnerId,
          required: true,
          options: learners.map((learner) => ({
            value: learner.id,
            label: `${learnerName(learner)} · ${learner.credit_balance} Credits`,
          })),
        }),
        courseSelect,
      ),
    );
  }

  form.append(
    selectField({
      label: 'Arbeitsbox',
      name: 'box_id',
      value: booking?.box_id ?? prefill.boxId,
      required: true,
      options: boxes.map((box) => ({ value: box.id, label: box.name })),
    }),
    h(
      'div',
      { class: 'stack', style: { '--stack-gap': '8px' } },
      h('strong', { text: 'Kurstage' }),
      h('p', {
        class: 'muted',
        text: 'Alle Tage müssen Montag bis Freitag und innerhalb eines Sieben-Tage-Fensters liegen.',
      }),
      datesHost,
    ),
    h(
      'label',
      { class: 'check-field' },
      h('input', { type: 'checkbox', name: 'override_business_rules', value: 'true' }),
      h(
        'span',
        {},
        h('strong', { text: 'Fachliche Regeln übersteuern' }),
        h('small', {
          text: 'Schultag und Kurseignung dürfen übersteuert werden. Physische Buchungsregeln bleiben zwingend.',
        }),
      ),
    ),
    message,
  );

  openDialog({
    title: isMove ? 'Buchung verschieben' : 'Manuelle Buchung erstellen',
    description: isMove
      ? `Bisherige Daten: ${initialDates.map((date) => formatDate(date)).join(', ')}`
      : 'Die Buchung wird verbindlich erstellt und Credits werden sofort abgezogen.',
    content: form,
    size: 'large',
    actions: [
      { label: 'Abbrechen' },
      {
        label: isMove ? 'Verbindlich verschieben' : 'Verbindlich buchen',
        variant: 'primary',
        onClick: async (event, close) => {
          const submitButton = event.currentTarget;
          setBusy(submitButton, true, isMove ? 'Verschieben …' : 'Buchen …');
          message.classList.add('is-hidden');
          try {
            const values = Object.fromEntries(new FormData(form));
            values.dates = [...form.querySelectorAll('input[name^="booking_date_"]')].map(
              (input) => input.value,
            );
            values.override_business_rules = values.override_business_rules === 'true';
            if (isMove) {
              values.booking_id = booking.id;
              await adminMoveBooking(values);
            } else {
              await adminCreateBooking(values);
            }
            close();
            showToast(isMove ? 'Buchung wurde verschoben.' : 'Buchung wurde erstellt.');
            await onSaved?.();
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
