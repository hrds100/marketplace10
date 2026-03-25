/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_UPTIMEROBOT_API_KEY?: string;
  readonly VITE_SENTRY_DSN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
