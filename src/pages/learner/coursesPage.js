import { learnerShell } from '../../app/appShell.js';
import { navigate } from '../../app/router.js';
import { store } from '../../app/store.js';
import { loadLearnerPortal } from '../../auth/learnerSession.js';
import { h } from '../../utils/dom.js';
import { formatProfessionScope, pluralizeDays } from '../../utils/formatters.js';
import { button, card, creditMeter, emptyState, statusBadge } from '../../components/common/ui.js';
import { icon } from '../../components/common/icons.js';

export async function learnerCoursesPage() {
  const portal = await loadLearnerPortal({ force: true });
  const learner = portal.learner;
  const courses = portal.courses ?? [];
  const holidayMode = store.get().bookingDraft.holidayMode;
  const content = h(
    'div',
    { class: 'learner-page' },
    h(
      'header',
      { class: 'learner-title stack' },
      h('span', { class: 'step-label', text: 'Schritt 2 von 3' }),
      h('h1', { text: `Hallo ${learner.first_name}, welchen Kurs möchtest du buchen?` }),
      h('p', { text: 'Du siehst nur Kurse, die zu deiner Ausbildung und deinem Lehrjahr passen.' }),
    ),
    creditMeter(learner.credit_balance, { large: true }),
    holidayMode
      ? h(
          'div',
          { class: 'holiday-banner' },
          h('span', { html: icon('info', 20) }),
          h(
            'div',
            {},
            h('strong', { text: 'Schulferien-Modus aktiv' }),
            h('p', { text: 'Dein regulärer Schultag ist für diese Buchung ebenfalls auswählbar.' }),
          ),
          button('Ändern', { variant: 'ghost', href: '#/learner/school-day' }),
        )
      : null,
    h(
      'section',
      { class: 'course-list' },
      courses.length
        ? courses.map((course) => {
            const canBook = course.can_book;
            return card(
              { class: `learner-course-card${canBook ? '' : ' is-disabled'}` },
              h(
                'header',
                { class: 'split' },
                h('span', { class: 'course-card__duration', text: String(course.duration_days) }),
                statusBadge(
                  canBook ? `${course.duration_days} Credits` : 'Nicht genügend Kurstage',
                  canBook ? 'neutral' : 'danger',
                ),
              ),
              h('h2', { text: course.title }),
              h('p', { text: course.short_description }),
              h(
                'div',
                { class: 'course-card__meta cluster' },
                h('span', { text: `Ab ${course.minimum_apprenticeship_year}. Lehrjahr` }),
                h('span', { text: formatProfessionScope(course.profession_scope) }),
                h('span', { text: pluralizeDays(course.duration_days) }),
              ),
              button(canBook ? 'Verfügbarkeit prüfen' : 'Nicht buchbar', {
                variant: canBook ? 'primary' : 'secondary',
                trailingIcon: canBook ? 'arrowRight' : undefined,
                disabled: !canBook,
                onClick: () => {
                  store.updateBooking({
                    course,
                    startDate: null,
                    availability: null,
                    box: null,
                    dates: [],
                  });
                  navigate('/learner/availability');
                },
              }),
            );
          })
        : emptyState(
            'Noch keine passenden Kurse vorhanden.',
            'Bitte wende dich an die Administration.',
          ),
    ),
  );
  return learnerShell(content, { active: 'courses' });
}
