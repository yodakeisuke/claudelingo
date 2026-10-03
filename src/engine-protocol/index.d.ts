export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }

// 外国語版：訳文か、訳せなかった理由
export type Translation = Result<string, string>
// モデルの返事：本文か、答えられなかった理由
export type Completion = { isAnswered: true; text: string } | { isAnswered: false; reason: string }

// 単語の絵：押した語のまとまり（句なら句）、絵が示すことの一文、動く SVG
export type Card = { unit: string; caption: string; svg: string }
// 指示の下に開いている絵。押した順に、押した語ごと（描いている間は card が無い）
export type Shown = { word: string; card?: Card; isFailed?: boolean; isWide?: boolean }

declare module 'claude-code' {
  interface PluginState {
    claudelingo: { translations: Record<string, Translation>; denied: string; draft: { text: string; version: Translation } | null; cards: Record<string, Shown[]>; drawn: Record<string, Card> }
  }
}
