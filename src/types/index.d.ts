// 外国語版：訳した、かエラー。API のエラーはそのまま持つ（$.model.complete の失敗）。呼び出し自体が拒まれたときはその message
export type ForeignVersion =
  | { text: string }
  | { error: { reason: 'api-error'; status: number | null; error: string } | { reason: 'empty-reply' | 'aborted' } | { message: string } }

declare module 'claude-code' {
  interface PluginState {
    claudelingo: { versions: Record<string, ForeignVersion>; denied: string }
  }
}
