/**
 * @omnidesk/config
 * Centralized constant definitions and environment configurations.
 */

export const APP_CONFIG = {
  APP_NAME: "OmniDesk AI",
  APP_VERSION: "2.0.0",
  API_VERSION: "v1",
  DEFAULT_PORT: {
    API: 4000,
    WEB: 5173,
    WS: 4000,
  },
  DEFAULT_CORS_ORIGINS: [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ],
  HEALTH_CHECK_INTERVAL_MS: 30000,
} as const;

export type AppConfig = typeof APP_CONFIG;
