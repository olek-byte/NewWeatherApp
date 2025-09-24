/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface ImportMetaEnv {
  readonly VITE_OWM_API_KEY: string
  readonly GEMINI_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
