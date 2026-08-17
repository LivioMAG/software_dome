import { adminShell } from '../../app/appShell.js';
import { getWeekSchedule } from '../../api/adminApi.js';
import { h } from '../../utils/dom.js';
import {
  addDays,
  formatDate,
  formatWeekday,
  isoWeekNumber,
  startOfIsoWeek,
  todayIso,
  weekDates,
} from '../../utils/dates.js';
import {
  button,
  card,
  iconButton,
  pageHeader,
  selectField,
  statusBadge,
} from '../../components/common/ui.js';
import { openAdminBookingDialog } from '../../components/admin/adminBookingDialog.js';

function isDateInBlock(block, date, boxId) {
  return (
    block.start_date <= date && block.end_date >= date && (!block.box_id || block.box_id === boxId)
  );
}

export async function calendarPage() {
  const container = h('div', { class: 'admin-page' });
  let monday = startOfIsoWeek(todayIso());
  let boxFilter = '';
  let courseFilter = '';
  let learnerFilter = '';

  const render = async () => {
    const schedule = await getWeekSchedule(monday);
    const dates = weekDates(monday);
    const visibleBoxes = boxFilter
      ? schedule.boxes.filter((box) => box.id === boxFilter)
      : schedule.boxes;
    const courses = [
      ...new Map(
        schedule.days.map((day) => [
          day.bookings.course_title_snapshot,
          day.bookings.course_title_snapshot,
        ]),
      ).values(),
    ];
    const learners = [
      ...new Map(
        schedule.days.map((day) => {
          const learner = day.bookings.learners;
          const name = `${learner?.first_name ?? ''} ${learner?.last_name ?? ''}`.trim();
          return [name, name];
        }),
      ).values(),
    ].filter(Boolean);

    const grid = h(
      'div',
      {
        class: 'week-calendar',
        role: 'grid',
        'aria-label': `Wochenplanung Kalenderwoche ${isoWeekNumber(monday)}`,
      },
      h('div', { class: 'week-calendar__corner', text: 'Arbeitsbox' }),
      dates.map((date) =>
        h(
          'div',
          {
            class: `week-calendar__day-head${date === todayIso() ? ' is-today' : ''}`,
            role: 'columnheader',
          },
          h('span', { text: formatWeekday(date, 'short') }),
          h('strong', { text: formatDate(date, { short: true }) }),
        ),
      ),
      visibleBoxes.flatMap((box) => [
        h(
          'div',
          { class: 'week-calendar__box', role: 'rowheader' },
          h('strong', { text: box.name }),
          statusBadge(box.active ? 'Aktiv' : 'Inaktiv', box.active ? 'success' : 'neutral'),
        ),
        ...dates.map((date) => {
          const bookingDay = schedule.days.find(
            (day) => day.box_id === box.id && day.booking_date === date,
          );
          const block = schedule.blocks.find((item) => isDateInBlock(item, date, box.id));
          if (bookingDay) {
            const booking = bookingDay.bookings;
            const name =
              `${booking.learners?.first_name ?? ''} ${booking.learners?.last_name ?? ''}`.trim();
            const filtered =
              (courseFilter && booking.course_title_snapshot !== courseFilter) ||
              (learnerFilter && name !== learnerFilter);
            return h(
              'a',
              {
                class: `calendar-cell calendar-cell--booking${filtered ? ' is-filtered' : ''}`,
                href: '#/admin/bookings',
                role: 'gridcell',
                title: `${name} · ${booking.course_title_snapshot}`,
              },
              h('strong', { text: name }),
              h('span', { text: booking.course_title_snapshot }),
            );
          }
          if (block) {
            return h(
              'div',
              { class: 'calendar-cell calendar-cell--blocked', role: 'gridcell' },
              h('strong', { text: 'Gesperrt' }),
              h('span', { text: block.title }),
            );
          }
          return h(
            'button',
            {
              class: 'calendar-cell calendar-cell--free',
              type: 'button',
              role: 'gridcell',
              disabled: !box.active || date < todayIso(),
              'aria-label': `Freie Buchung in ${box.name} am ${formatDate(date)}`,
              'on:click': () =>
                openAdminBookingDialog({
                  prefill: { boxId: box.id, date },
                  onSaved: render,
                }),
            },
            h('span', { text: date < todayIso() ? 'Vergangen' : 'Frei' }),
          );
        }),
      ]),
    );

    const boxSelect = selectField({
      label: 'Box',
      name: 'box_filter',
      value: boxFilter,
      options: [
        { value: '', label: 'Alle Boxen' },
        ...schedule.boxes.map((box) => ({ value: box.id, label: box.name })),
      ],
      'on:change': async (event) => {
        boxFilter = event.target.value;
        await render();
      },
    });
    const courseSelect = selectField({
      label: 'Kurs',
      name: 'course_filter',
      value: courseFilter,
      options: [
        { value: '', label: 'Alle Kurse' },
        ...courses.map((value) => ({ value, label: value })),
      ],
      'on:change': async (event) => {
        courseFilter = event.target.value;
        await render();
      },
    });
    const learnerSelect = selectField({
      label: 'Lernender',
      name: 'learner_filter',
      value: learnerFilter,
      options: [
        { value: '', label: 'Alle Lernenden' },
        ...learners.map((value) => ({ value, label: value })),
      ],
      'on:change': async (event) => {
        learnerFilter = event.target.value;
        await render();
      },
    });

    container.replaceChildren(
      pageHeader('Wochenplanung', 'Belegungen und Sperrzeiten von Montag bis Freitag.', [
        button('Manuell buchen', {
          icon: 'plus',
          onClick: () => openAdminBookingDialog({ onSaved: render }),
        }),
      ]),
      card(
        { class: 'calendar-toolbar' },
        h(
          'div',
          { class: 'calendar-toolbar__week cluster' },
          iconButton('chevronLeft', 'Vorherige Woche', async () => {
            monday = addDays(monday, -7);
            await render();
          }),
          h(
            'div',
            {},
            h('strong', { text: `Kalenderwoche ${isoWeekNumber(monday)}` }),
            h('span', { text: `${formatDate(monday)} – ${formatDate(addDays(monday, 4))}` }),
          ),
          iconButton('chevronRight', 'Nächste Woche', async () => {
            monday = addDays(monday, 7);
            await render();
          }),
          button('Heute', {
            variant: 'ghost',
            onClick: async () => {
              monday = startOfIsoWeek(todayIso());
              await render();
            },
          }),
        ),
        h('div', { class: 'calendar-filters' }, boxSelect, courseSelect, learnerSelect),
      ),
      card({ class: 'calendar-card' }, grid),
    );
  };

  await render();
  return adminShell(container);
}
