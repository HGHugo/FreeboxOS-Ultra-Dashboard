/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LOGO_DEV_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.svg' {
  const content: string;
  export default content;
}
