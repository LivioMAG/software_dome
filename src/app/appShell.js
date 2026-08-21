import { signOutAdmin } from '../auth/adminAuth.js';
import { signOutLearner } from '../auth/learnerSession.js';
import { h } from '../utils/dom.js';
import { navigate } from './router.js';
import { brand, iconButton } from '../components/common/ui.js';
import { icon } from '../components/common/icons.js';

const adminNav = [
  ['/admin/dashboard', 'Übersicht', 'dashboard'],
  ['/admin/calendar', 'Wochenplanung', 'calendar'],
  ['/admin/learners', 'Lernende', 'users'],
  ['/admin/business-offices', 'Geschäftsstellen', 'users'],
  ['/admin/courses', 'Kurse', 'course'],
  ['/admin/boxes', 'Boxen', 'box'],
  ['/admin/blocks', 'Sperrzeiten', 'lock'],
  ['/admin/bookings', 'Buchungen', 'booking'],
  ['/admin/credits', 'Credits', 'credits'],
  ['/admin/tablet', 'Tablet-Zugang', 'lock'],
];

function navLink([path, label, iconName]) {
  const active = window.location.hash === `#${path}`;
  return h(
    'a',
    {
      class: `side-nav__link${active ? ' is-active' : ''}`,
      href: `#${path}`,
      'aria-current': active ? 'page' : null,
    },
    h('span', { html: icon(iconName, 19) }),
    h('span', { text: label }),
  );
}

export function publicShell(content, options = {}) {
  return h(
    'div',
    { class: 'public-shell' },
    h('header', { class: 'public-header' }, brand(), options.headerAction),
    h('main', { id: 'main-content', class: 'public-main' }, content),
    h(
      'footer',
      { class: 'public-footer' },
      h('span', { text: 'MasterMag' }),
      h('span', { text: 'Sichere Kursplanung für Lernende' }),
    ),
  );
}

export function adminShell(content) {
  const sidebar = h(
    'aside',
    { class: 'admin-sidebar', id: 'admin-sidebar' },
    h('div', { class: 'admin-sidebar__brand' }, brand()),
    h('nav', { class: 'side-nav', 'aria-label': 'Administration' }, adminNav.map(navLink)),
    h(
      'button',
      {
        class: 'side-nav__link side-nav__logout',
        type: 'button',
        'on:click': async () => {
          await signOutAdmin();
          navigate('/admin/login');
        },
      },
      h('span', { html: icon('logout', 19) }),
      h('span', { text: 'Abmelden' }),
    ),
  );
  const overlay = h('button', {
    class: 'sidebar-overlay',
    type: 'button',
    'aria-label': 'Navigation schliessen',
    'on:click': () => document.body.classList.remove('nav-open'),
  });
  return h(
    'div',
    { class: 'admin-shell' },
    sidebar,
    overlay,
    h(
      'div',
      { class: 'admin-content' },
      h(
        'header',
        { class: 'admin-mobile-header' },
        brand({ compact: true }),
        iconButton('menu', 'Navigation öffnen', () => document.body.classList.add('nav-open')),
      ),
      h('main', { id: 'main-content', class: 'admin-main' }, content),
    ),
  );
}

export function learnerShell(content, { active = 'courses', hideNav = false } = {}) {
  const links = [
    ['/learner/courses', 'Kurse', 'course', 'courses'],
    ['/learner/bookings', 'Meine Buchungen', 'booking', 'bookings'],
  ];
  const navigation = h(
    'nav',
    { class: 'learner-nav', 'aria-label': 'Lernenden-Portal' },
    links.map(([path, label, iconName, key]) =>
      h(
        'a',
        { href: `#${path}`, class: `learner-nav__link${active === key ? ' is-active' : ''}` },
        h('span', { html: icon(iconName, 20) }),
        h('span', { text: label }),
      ),
    ),
  );
  return h(
    'div',
    { class: 'learner-shell' },
    h(
      'header',
      { class: 'learner-header' },
      brand({ compact: true }),
      h(
        'button',
        {
          class: 'learner-header__logout',
          type: 'button',
          'on:click': async () => {
            await signOutLearner();
            navigate('/learner/login');
          },
        },
        h('span', { html: icon('logout', 17) }),
        h('span', { text: 'Abmelden' }),
      ),
    ),
    h('main', { id: 'main-content', class: 'learner-main' }, content),
    hideNav ? null : navigation,
  );
}
