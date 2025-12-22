/**
 * Application-wide constants
 */

// Cache TTLs (in seconds)
export const CACHE_TTL = {
    NOTE: 3600, // 1 hour
    NOTES_LIST: 3600, // 1 hour
    SEARCH_RESULTS: 1800, // 30 minutes
} as const;

// JWT Configuration
export const JWT_CONFIG = {
    ACCESS_TOKEN_EXPIRES_IN: '15m', // 15 minutes
    REFRESH_TOKEN_EXPIRES_IN: '7d', // 7 days
    REFRESH_TOKEN_EXPIRES_IN_SECONDS: 7 * 24 * 60 * 60, // 7 days in seconds (604800)
    EXPIRES_IN: '15m', // Legacy support, use ACCESS_TOKEN_EXPIRES_IN
} as const;

// Validation Limits
export const VALIDATION_LIMITS = {
    USERNAME_MIN_LENGTH: 3,
    USERNAME_MAX_LENGTH: 50,
    PASSWORD_MIN_LENGTH: 6,
    NOTE_CONTENT_MAX_LENGTH: 10000,
} as const;

// Default Values
export const DEFAULTS = {
    NOTE_VERSION: 1,
    PORT: 8080,
} as const;

