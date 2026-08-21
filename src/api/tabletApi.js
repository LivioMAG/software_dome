import { getSupabase } from '../lib/supabaseClient.js';
import { unwrap } from './apiClient.js';

export const generateTabletCode = async (code = null) =>
  unwrap(await getSupabase().rpc('admin_set_tablet_code', { p_code: code }));
export const getTabletCode = async () => unwrap(await getSupabase().rpc('admin_get_tablet_code'));
export const connectBoxTablet = async (code, boxId) =>
  unwrap(
    await getSupabase().rpc('connect_box_tablet', {
      p_code: code.trim(),
      p_box_id: boxId,
    }),
  );
export const listTabletBoxes = async () => unwrap(await getSupabase().rpc('list_tablet_boxes'));
export const getBoxTabletDay = async (token, date) =>
  unwrap(await getSupabase().rpc('get_box_tablet_day', { p_token: token, p_date: date }));
