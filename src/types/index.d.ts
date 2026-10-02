export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }

// $.model.complete の失敗をそのまま。呼び出し自体が拒まれたときはその message
export type TranslationError =
  | { reason: 'api-error'; status: number | null; error: string }
  | { reason: 'empty-reply' | 'aborted' }
  | { message: string }

// 外国語版：訳文か、エラー
export type Translation = Result<string, TranslationError>

declare module 'claude-code' {
  interface PluginState {
    claudelingo: { translations: Record<string, Translation & { languages: string }>; denied: string; saves: number }
  }
}
