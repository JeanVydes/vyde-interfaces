/// <reference types="vite/client" />

/**
 * The environment variables this app reads, declared so a typo is a compile error rather than an
 * `undefined` read at a call site.
 */
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_ALLOWED_RETURN_ORIGINS?: string;
  readonly VITE_APP_ORIGIN?: string;
  readonly VITE_DEFAULT_ACCENT?: string;
  readonly VITE_MOCK_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
