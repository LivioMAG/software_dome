export class AppError extends Error {
  constructor(message, code = 'UNKNOWN', cause) {
    super(message, { cause });
    this.name = 'AppError';
    this.code = code;
  }
}

const ERROR_MESSAGES = {
  INVALID_LEARNER_CREDENTIALS: 'Die Angaben konnten nicht bestätigt werden.',
  RATE_LIMITED: 'Zu viele Versuche. Bitte warte einige Minuten und versuche es erneut.',
  SESSION_EXPIRED: 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.',
  BOOKING_CONFLICT:
    'Einer der gewählten Tage wurde zwischenzeitlich vergeben. Bitte wähle die verfügbaren Tage erneut.',
  INSUFFICIENT_CREDITS: 'Für diesen Kurs stehen nicht genügend Kurstage zur Verfügung.',
  CANCELLATION_TOO_LATE:
    'Diese Buchung kann nicht mehr selbst storniert werden. Bitte wende dich an den Administrator.',
  NOT_ADMIN: 'Du besitzt keine Berechtigung für den Administrationsbereich.',
};

export function normalizeError(
  error,
  fallback = 'Etwas ist schiefgelaufen. Bitte versuche es erneut.',
) {
  if (error instanceof AppError) return error;
  const rawMessage = error?.message ?? error?.details ?? '';
  const codeMatch = Object.keys(ERROR_MESSAGES).find((code) => rawMessage.includes(code));
  if (codeMatch) return new AppError(ERROR_MESSAGES[codeMatch], codeMatch, error);
  if (/Failed to fetch|NetworkError|fetch/i.test(rawMessage)) {
    return new AppError(
      'Die Verbindung zum Server konnte nicht hergestellt werden.',
      'NETWORK',
      error,
    );
  }
  return new AppError(rawMessage || fallback, error?.code ?? 'UNKNOWN', error);
}
