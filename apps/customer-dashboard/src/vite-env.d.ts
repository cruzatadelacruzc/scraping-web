/// <reference types="vite/client" />
declare module '*.css' {
  const classes: Record<string, string>;
  export default classes;
}

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_VAPID_PUBLIC_KEY: string;
  readonly VITE_MSW_ENABLED: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}