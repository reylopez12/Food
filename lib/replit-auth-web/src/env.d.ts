// Declares Vite's import.meta.env shape so this lib typechecks without
// requiring vite as a dependency (it is consumed by a Vite host at build time).
interface ImportMetaEnv {
  readonly BASE_URL: string;
  readonly [key: string]: string | boolean | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
