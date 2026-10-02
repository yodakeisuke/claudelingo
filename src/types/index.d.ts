export type Translations = Record<string, string>

declare module 'claude-code' {
  interface PluginState {
    claudelingo: { translations: Translations; isOff: boolean }
  }
}
