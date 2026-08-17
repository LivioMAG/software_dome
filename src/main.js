import './styles/reset.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/utilities.css';
import './styles/components/ui.css';
import './styles/components/dialog.css';
import './styles/components/table.css';
import './styles/components/calendar.css';
import './styles/components/booking.css';
import './styles/pages/home.css';
import './styles/pages/admin.css';
import './styles/pages/learner.css';

import { initializeSupabase } from './lib/supabaseClient.js';
import { Router } from './app/router.js';
import { routes, notFoundRoute } from './app/routes.js';
import { setupPage } from './pages/public/setupPage.js';
import { normalizeError } from './utils/errors.js';

async function bootstrap() {
  const root = document.querySelector('#app');
  try {
    await initializeSupabase();
    const router = new Router({ root, routes, notFound: notFoundRoute });
    router.start();
  } catch (error) {
    const normalized = normalizeError(error);
    root.replaceChildren(setupPage(normalized));
    document.title = 'Einrichtung · MasterMag';
  }
}

bootstrap();
