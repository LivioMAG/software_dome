import { clear } from '../utils/dom.js';

function normalizeHash() {
  const hash = window.location.hash || '#/';
  return hash.startsWith('#/') ? hash.slice(1).split('?')[0] : '/';
}

export class Router {
  constructor({ root, routes, notFound }) {
    this.root = root;
    this.routes = routes;
    this.notFound = notFound;
    this.handleChange = this.handleChange.bind(this);
  }

  start() {
    window.addEventListener('hashchange', this.handleChange);
    this.handleChange();
  }

  stop() {
    window.removeEventListener('hashchange', this.handleChange);
  }

  async handleChange() {
    const path = normalizeHash();
    const route = this.routes.find((candidate) => candidate.path === path);
    const activeRoute = route ?? this.notFound;
    clear(this.root);
    this.root.append(activeRoute.loading?.() ?? document.createTextNode('Wird geladen …'));

    try {
      if (activeRoute.guard) {
        const redirect = await activeRoute.guard();
        if (redirect) {
          this.navigate(redirect, true);
          return;
        }
      }
      const page = await activeRoute.render({ path });
      clear(this.root).append(page);
      document.title = `${activeRoute.title ?? 'MasterMag'} · MasterMag`;
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch (error) {
      const page = await activeRoute.onError?.(error);
      if (page) clear(this.root).append(page);
      else throw error;
    }
  }

  navigate(path, replace = false) {
    const hash = `#${path}`;
    if (replace) window.location.replace(hash);
    else if (window.location.hash === hash) this.handleChange();
    else window.location.hash = hash;
  }
}

export const navigate = (path) => {
  window.location.hash = `#${path}`;
};
