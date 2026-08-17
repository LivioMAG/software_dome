import { normalizeError } from '../utils/errors.js';

export function unwrap({ data, error }) {
  if (error) throw normalizeError(error);
  return data;
}

export function normalizeSearch(value) {
  return value?.trim().replaceAll(/[,%()]/g, '') ?? '';
}
