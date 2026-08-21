import { adminGuard } from '../auth/adminAuth.js';
import { learnerGuard, learnerSchoolDayGuard } from '../auth/learnerSession.js';
import { loadingState } from '../components/common/ui.js';
import { normalizeError } from '../utils/errors.js';
import { homePage } from '../pages/public/homePage.js';
import { notFoundPage } from '../pages/public/notFoundPage.js';
import { publicShell } from './appShell.js';
import { errorState } from '../components/common/ui.js';
import { adminLoginPage } from '../pages/admin/loginPage.js';
import { dashboardPage } from '../pages/admin/dashboardPage.js';
import { calendarPage } from '../pages/admin/calendarPage.js';
import { learnersPage } from '../pages/admin/learnersPage.js';
import { coursesPage } from '../pages/admin/coursesPage.js';
import { boxesPage } from '../pages/admin/boxesPage.js';
import { blocksPage } from '../pages/admin/blocksPage.js';
import { bookingsPage } from '../pages/admin/bookingsPage.js';
import { creditsPage } from '../pages/admin/creditsPage.js';
import { businessOfficesPage } from '../pages/admin/businessOfficesPage.js';
import { tabletAdminPage } from '../pages/admin/tabletAdminPage.js';
import { businessOfficePage } from '../pages/learner/businessOfficePage.js';
import { tabletPage } from '../pages/public/tabletPage.js';
import { bookingApprovalPage } from '../pages/public/bookingApprovalPage.js';
import { learnerLoginPage } from '../pages/learner/loginPage.js';
import { schoolDayPage } from '../pages/learner/schoolDayPage.js';
import { learnerCoursesPage } from '../pages/learner/coursesPage.js';
import { availabilityPage } from '../pages/learner/availabilityPage.js';
import { bookingReviewPage } from '../pages/learner/bookingReviewPage.js';
import { learnerBookingsPage } from '../pages/learner/bookingsPage.js';

const loading = () => publicShell(loadingState());
const onError = async (error) =>
  publicShell(errorState(normalizeError(error).message, () => window.location.reload()));

export const routes = [
  { path: '/', title: 'Start', render: homePage, loading, onError },
  { path: '/admin/login', title: 'Admin anmelden', render: adminLoginPage, loading, onError },
  {
    path: '/admin/dashboard',
    title: 'Übersicht',
    render: dashboardPage,
    guard: adminGuard,
    loading,
    onError,
  },
  {
    path: '/admin/calendar',
    title: 'Wochenplanung',
    render: calendarPage,
    guard: adminGuard,
    loading,
    onError,
  },
  {
    path: '/admin/learners',
    title: 'Lernende',
    render: learnersPage,
    guard: adminGuard,
    loading,
    onError,
  },
  {
    path: '/admin/courses',
    title: 'Kurse',
    render: coursesPage,
    guard: adminGuard,
    loading,
    onError,
  },
  {
    path: '/admin/business-offices',
    title: 'Geschäftsstellen',
    render: businessOfficesPage,
    guard: adminGuard,
    loading,
    onError,
  },
  { path: '/admin/boxes', title: 'Boxen', render: boxesPage, guard: adminGuard, loading, onError },
  {
    path: '/admin/blocks',
    title: 'Sperrzeiten',
    render: blocksPage,
    guard: adminGuard,
    loading,
    onError,
  },
  {
    path: '/admin/bookings',
    title: 'Buchungen',
    render: bookingsPage,
    guard: adminGuard,
    loading,
    onError,
  },
  {
    path: '/admin/credits',
    title: 'Credits',
    render: creditsPage,
    guard: adminGuard,
    loading,
    onError,
  },
  {
    path: '/admin/tablet',
    title: 'Tablet-Zugang',
    render: tabletAdminPage,
    guard: adminGuard,
    loading,
    onError,
  },
  { path: '/tablet', title: 'Box-Tablet', render: tabletPage, loading, onError },
  {
    path: '/booking-approval',
    title: 'Buchung freigeben',
    render: bookingApprovalPage,
    loading,
    onError,
  },
  { path: '/learner/login', title: 'Kurs buchen', render: learnerLoginPage, loading, onError },
  {
    path: '/learner/school-day',
    title: 'Schultag',
    render: schoolDayPage,
    guard: learnerGuard,
    loading,
    onError,
  },
  {
    path: '/learner/business-office',
    title: 'Geschäftsstelle',
    render: businessOfficePage,
    guard: learnerGuard,
    loading,
    onError,
  },
  {
    path: '/learner/courses',
    title: 'Kurse',
    render: learnerCoursesPage,
    guard: learnerSchoolDayGuard,
    loading,
    onError,
  },
  {
    path: '/learner/availability',
    title: 'Verfügbarkeit',
    render: availabilityPage,
    guard: learnerSchoolDayGuard,
    loading,
    onError,
  },
  {
    path: '/learner/booking-review',
    title: 'Buchung prüfen',
    render: bookingReviewPage,
    guard: learnerSchoolDayGuard,
    loading,
    onError,
  },
  {
    path: '/learner/bookings',
    title: 'Meine Buchungen',
    render: learnerBookingsPage,
    guard: learnerSchoolDayGuard,
    loading,
    onError,
  },
];

export const notFoundRoute = { title: 'Nicht gefunden', render: notFoundPage, loading, onError };
