import { ReplyRequest } from './reply-request'

// --- public interface
export const ReplyTranslations = {
  request: (settings: Settings, text: string) => request(settings, text),
  shown: (text: string, value: string) => shown(text, value),
  key: (text: string) => key(text),
}

// --- I/O
type Settings = Parameters<typeof ReplyRequest.of>[0]

// --- operations
// 訳すのはコードでない段落だけ
const request = (settings: Settings, text: string) => asked(settings, paragraphs(text).filter(p => !isCode(p)))
// 段落ごとの訳と、学ぶ言語へ訳したか
const shown = (text: string, value: string) => ({ paragraphs: paired(paragraphs(text), value), isIntoTarget: isIntoTarget(value) })

// ブロックごとのボタンの名前。デスクトップは返事のブロックを一つの画面に並べ、同じ名前が並ぶと最後のブロックしか描かない
const key = (text: string) => `reply-${[...text].reduce((h, c) => Math.imul(h ^ c.codePointAt(0)!, 16777619) >>> 0, 2166136261).toString(36)}`

// --- business rules
// 訳す段落が無ければ頼まない
const asked = (settings: Settings, prose: string[]) => (prose.length > 0 ? ReplyRequest.of(settings, prose) : undefined)
// 段落ごとに、コードでない段落の通し番号の訳を添える（コードの段落と、訳が欠けた段落には無い）
const paired = (all: string[], value: string) =>
  all.map((p, i) => ({ text: p, translation: isCode(p) ? undefined : numbered(value, all.slice(0, i).filter(q => !isCode(q)).length + 1) }))
// 段落は空行で区切る。コードブロックの中の空行では切らない。行頭の下げは残す
const paragraphs = (text: string) =>
  text.split(/\n[ \t]*\n/).reduce<string[]>((list, chunk) => (isOpen(list.at(-1)) ? [...list.slice(0, -1), `${list.at(-1)}\n\n${chunk}`] : [...list, chunk]), []).map(p => p.replace(/^\n+|\s+$/g, '')).filter(Boolean)
// ``` か ~~~ が奇数個なら、コードブロックが閉じていない
const isOpen = (paragraph?: string) => (paragraph?.match(/^[ \t]*(```|~~~)/gm)?.length ?? 0) % 2 === 1
// コードブロックの外に文字が残らない段落がコード
const isCode = (paragraph: string) => paragraph.replace(/^[ \t]*(```|~~~)[\s\S]*?^[ \t]*\1[^\n]*$/gm, '').trim() === ''
// [n] の訳。最初に出た [n] を使う（[1]: の参照リンクは番号とみなさない）
const numbered = (value: string, n: number) => {
  const parts = value.split(/^\[(\d+)\](?!:)[ \t]*/m)
  const at = parts.findIndex((s, i) => i % 2 === 1 && s === String(n))
  return at > 0 ? parts[at + 1]?.trim() : undefined
}
// 学ぶ言語へ訳したか
const isIntoTarget = (value: string) => /^INTO:\s*TARGET/m.test(value)
