import { learnerShell } from '../../app/appShell.js';
import { navigate } from '../../app/router.js';
import { store } from '../../app/store.js';
import { getLearnerToken, loadLearnerPortal } from '../../auth/learnerSession.js';
import { createLearnerBooking } from '../../api/learnerApi.js';
import { h, setBusy } from '../../utils/dom.js';
import { formatDate } from '../../utils/dates.js';
import { formatSchoolDay, pluralizeDays } from '../../utils/formatters.js';
import { normalizeError } from '../../utils/errors.js';
import {
  button,
  card,
  formMessage,
  pageHeader,
  statusBadge,
  textareaField,
} from '../../components/common/ui.js';
import { showToast } from '../../components/common/toast.js';
import { sendBookingApprovalEmail } from '../../lib/email.js';

export async function bookingReviewPage() {
  const draft = store.get().bookingDraft;
  const portal = await loadLearnerPortal();
  if (!draft.course || !draft.box || draft.dates.length !== draft.course.duration_days) {
    navigate('/learner/courses');
    return h('div');
  }
  const learner = portal.learner;
  const after = learner.credit_balance - draft.course.duration_days;
  const message = formMessage();
  const remarkField = textareaField({
    label: `Bemerkung${draft.course.remark_required ? ' (Pflicht)' : ' (optional)'}`,
    name: 'remark',
    required: draft.course.remark_required,
    maxlength: 1000,
    help: draft.course.remark_required
      ? 'Dieser Kurs verlangt eine Bemerkung.'
      : 'Zusätzliche Informationen für die Geschäftsleitung.',
  });
  const confirmButton = button('Verbindlich buchen', {
    trailingIcon: 'check',
    class: 'full-width',
  });
  confirmButton.addEventListener('click', async () => {
    setBusy(confirmButton, true, 'Buchung wird geprüft …');
    message.classList.add('is-hidden');
    try {
      if (draft.course.remark_required && !remarkField.value.trim()) {
        message.textContent = 'Bitte gib für diesen Kurs eine Bemerkung ein.';
        message.classList.remove('is-hidden');
        setBusy(confirmButton, false);
        return;
      }
      const result = await createLearnerBooking(
        getLearnerToken(),
        draft.course.id,
        draft.box.id,
        draft.dates,
        draft.holidayMode,
        remarkField.value,
      );
      const approvalUrl = `${window.location.origin}${window.location.pathname}#/booking-approval?token=${result.approval_token ?? ''}`;
      const emailSent = await sendBookingApprovalEmail({
        to_email: learner.gl_email,
        to_name: learner.gl_name,
        learner_name: `${learner.first_name} ${learner.last_name}`,
        course: draft.course.title,
        dates: draft.dates.join(', '),
        remark: remarkField.value || '–',
        approval_url: approvalUrl,
      }).catch(() => false);
      store.resetBooking();
      await loadLearnerPortal({ force: true });
      showToast(
        `Buchung ${result.booking_number ?? result.booking_id?.slice(0, 8).toUpperCase()} wurde bestätigt.`,
      );
      if (!emailSent)
        showToast(
          'Buchung gespeichert; die E-Mail an die GL konnte nicht versendet werden.',
          'error',
        );
      navigate('/learner/bookings');
    } catch (error) {
      message.textContent = normalizeError(error).message;
      message.classList.remove('is-hidden');
      setBusy(confirmButton, false);
    }
  });
  const summaryItems = [
    ['Kurs', draft.course.title],
    ['Arbeitsbox', draft.box.name],
    ['Kursdauer', pluralizeDays(draft.course.duration_days)],
    ['Benötigte Credits', String(draft.course.duration_days)],
    ['Credit-Stand vorher', `${learner.credit_balance} von 5`],
    ['Credit-Stand nachher', `${after} von 5`],
    ['Regulärer Schultag', formatSchoolDay(learner.school_weekday)],
    ['Schulferien-Modus', draft.holidayMode ? 'Aktiv' : 'Nicht aktiv'],
  ];
  return learnerShell(
    h(
      'div',
      { class: 'learner-page review-page' },
      pageHeader('Buchung prüfen', 'Kontrolliere deine Auswahl, bevor du verbindlich buchst.'),
      card(
        { class: 'stack booking-summary-card' },
        h(
          'header',
          {},
          statusBadge('Bereit zur Buchung', 'success'),
          h('h2', { text: draft.course.title }),
          h('p', { text: draft.course.short_description }),
        ),
        remarkField,
        h(
          'div',
          { class: 'summary-grid' },
          summaryItems.map(([label, value]) =>
            h('div', {}, h('span', { text: label }), h('strong', { text: value })),
          ),
        ),
        h(
          'div',
          { class: 'stack', style: { '--stack-gap': '8px' } },
          h('strong', { text: 'Ausgewählte Kurstage' }),
          h(
            'div',
            { class: 'date-chip-list' },
            draft.dates.map((date) => h('span', { text: formatDate(date) })),
          ),
        ),
        h(
          'div',
          { class: 'cancellation-notice' },
          h('strong', { text: 'Stornierungsfrist' }),
          h('p', {
            text: 'Du kannst diese Buchung bis einschliesslich 14 Kalendertage vor dem ersten Kurstag selbst stornieren.',
          }),
        ),
        message,
      ),
      h(
        'div',
        { class: 'review-actions' },
        button('Auswahl bearbeiten', {
          variant: 'secondary',
          icon: 'arrowLeft',
          onClick: () => navigate('/learner/availability'),
        }),
        confirmButton,
      ),
    ),
    { active: 'courses', hideNav: true },
  );
}
