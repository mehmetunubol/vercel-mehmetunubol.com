// Only this account can manage users, groups and settings.
export const ADMIN_USERNAME = "munubol";

export const MAX_MESSAGE_CHARS = 4000;
export const DEFAULT_MESSAGE_TTL_HOURS = 24;
export const MIN_MESSAGE_TTL_HOURS = 1;
export const MAX_MESSAGE_TTL_HOURS = 24 * 30;

export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MINUTES = 15;

export const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;
export const MIN_PASSWORD_LENGTH = 8;
