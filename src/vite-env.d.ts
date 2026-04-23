/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CF_ACCOUNT_HASH: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
