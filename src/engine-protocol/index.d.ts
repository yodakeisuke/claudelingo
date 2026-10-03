export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }

// 外国語版：訳文か、訳せなかった理由
export type Translation = Result<string, string>
// モデルの返事：本文か、答えられなかった理由
export type Completion = { isAnswered: true; text: string } | { isAnswered: false; reason: string }

// 単語の絵：押した語のまとまり（句なら句）、その発音記号、絵が示すことの一文、動く SVG
export type Card = { unit: string; pron: string; caption: string; svg: string }
// 語を深める欄：例文・類似表現・語源
export type Aspect = 'examples' | 'similar' | 'origin'
// 欄の 1 項目：本文と、その下に薄く添える行（訳と気持ち、使い分け、由来）
export type Item = { text: string; notes: string[] }
// 開いている欄（書いている間は items が無い）
export type Opened = { items?: Item[]; isFailed?: boolean }
// 指示の下に開いている絵。押した順に、押した語ごと（描いている間は card が無い）。その下に開いている欄
export type Shown = { word: string; card?: Card; isFailed?: boolean; isWide?: boolean; aspects?: Partial<Record<Aspect, Opened>> }
// 話す練習：お手本とその発音記号、声で入れた文、そのコーチ（頼んでいる間は null）
export type Practice = { sample: string; pron?: string; heard?: string; coach?: Translation | null }

declare module 'claude-code' {
  interface PluginState {
    claudelingo: { translations: Record<string, Translation>; denied: string; draft: { text: string; version: Translation } | null; cards: Record<string, Shown[]>; drawn: Record<string, Card>; replies: Record<string, Translation | null>; sounds: Record<string, string[] | null>; practice: Practice | null }
  }
}
