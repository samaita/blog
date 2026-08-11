/// <reference types="vite/client" />

declare module "virtual:benchmarks" {
  export const BENCHMARKS: string[]
}

interface ImportMetaEnv {
  readonly AQ_API_BASE_URL?: string
  readonly AQ_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
