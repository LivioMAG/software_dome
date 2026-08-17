import { getSupabase } from '../lib/supabaseClient.js';
import { store } from '../app/store.js';
import { normalizeError, AppError } from '../utils/errors.js';

export async function signInAdmin(email, password) {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw normalizeError(error, 'E-Mail oder Passwort ist ungültig.');
  const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');
  if (adminError || !isAdmin) {
    await supabase.auth.signOut();
    throw new AppError(
      'Dieses Benutzerkonto besitzt keinen Admin-Zugriff.',
      'NOT_ADMIN',
      adminError,
    );
  }
  store.set({ admin: data.user });
  return data.user;
}

export async function getCurrentAdmin() {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;
  const { data: isAdmin, error } = await supabase.rpc('is_admin');
  if (error || !isAdmin) return null;
  store.set({ admin: data.session.user });
  return data.session.user;
}

export async function signOutAdmin() {
  await getSupabase().auth.signOut();
  store.set({ admin: null });
}

export async function adminGuard() {
  return (await getCurrentAdmin()) ? null : '/admin/login';
}
