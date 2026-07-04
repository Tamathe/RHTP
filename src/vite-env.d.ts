/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly NEXT_PUBLIC_RHTP_REAL_VOICE?: string
  readonly VITE_RHTP_REAL_VOICE?: string
  readonly VITE_RHTP_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
