export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }

// 外国語版：訳文か、訳せなかった理由
export type Translation = Result<string, string>

declare module 'claude-code' {
  interface PluginState {
    claudelingo: { translations: Record<string, Translation>; denied: string; suggestion: { draft: string; version: Translation } | null }
  }
}
