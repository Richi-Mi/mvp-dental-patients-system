/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  /** URL base del backend Elysia. Default: http://localhost:3000 */
  readonly VITE_API_URL?: string
  /** Id del build, lo fija `vite.config.ts`. Invalida la caché guardada. */
  readonly VITE_APP_BUILD?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
