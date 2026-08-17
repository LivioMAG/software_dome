import { AppError } from '../utils/errors.js';

let cachedConfig;

export async function loadConfig() {
  if (cachedConfig) return cachedConfig;
  let response;
  try {
    // document.baseURI points to /software_dome/ on GitHub Pages and to /
    // during local development. The hash-router never changes this base URL.
    const configUrl = new URL('config.json', document.baseURI);
    response = await fetch(configUrl, { cache: 'no-store' });
  } catch (error) {
    throw new AppError(
      'Die Konfigurationsdatei konnte nicht geladen werden.',
      'CONFIG_MISSING',
      error,
    );
  }
  if (!response.ok) {
    throw new AppError(
      'MasterMag ist noch nicht eingerichtet. Erstelle public/config.json anhand der Beispieldatei.',
      'CONFIG_MISSING',
    );
  }

  const config = await response.json().catch(() => null);
  const validUrl = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config?.supabaseUrl ?? '');
  const validKey =
    typeof config?.supabaseAnonKey === 'string' && config.supabaseAnonKey.length > 40;
  if (!validUrl || !validKey) {
    throw new AppError(
      'Die Supabase-Konfiguration ist ungültig. Prüfe URL und Anon-Key in public/config.json.',
      'CONFIG_INVALID',
    );
  }
  cachedConfig = Object.freeze(config);
  return cachedConfig;
}
