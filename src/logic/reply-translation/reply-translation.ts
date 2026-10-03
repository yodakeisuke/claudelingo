import type { Translation } from '../../engine-protocol'
import { PromptTranslations } from '../prompt-translation/prompt-translation'
import { Result } from '../result/result'
import { ReplyRequest } from './reply-request'

// --- public interface
export const ReplyTranslations = {
  request: (settings: Settings, text: string) => request(settings, text),
  shown: (settings: Settings, text: string, value: string) => shown(settings, text, value),
  head: (text: string) => head(text),
  key: (settings: Settings, text: string) => key(settings, text),
  isDue: (version?: Translation | null) => isDue(version),
}

// --- I/O
type Settings = Parameters<typeof ReplyRequest.of>[0] & { enabled: boolean; card: boolean }

// --- operations
// 訳すのはコードでない段落だけ
const request = (settings: Settings, text: string) => asked(settings, paragraphs(text).filter(p => !isCode(p)))
// 訳のある段落ごとの訳と、読み上げる文の並び、訳の語から絵を出すか
const shown = (settings: Settings, text: string, value: string) => shaped(settings, paired(paragraphs(text), value).flatMap(withTranslation), value)

// --- business rules
// 訳は言語の組み合わせごとに覚える（設定で言語を変えたら、押し直すと訳し直す）
const key = ({ native, target }: Settings, text: string) => `${native}>${target}\n${text}`
// 訳のパネルの見出しは返事の書き出しの 1 行（Markdown の印と表の両端の | は外す）
const head = (text: string) => PromptTranslations.plain(text.trim().split('\n')[0] ?? '').replace(/^([-*+]|\d+[.)]|#{1,6}|>)\s+|^\s*\||\|\s*$/g, '').trim()
// 訳を頼むのは、まだ頼んでいないか、訳せなかったとき（訳している間と、訳せた後は頼まない）
const isDue = (version?: Translation | null) => version === undefined || (version !== null && Result.given(version).either(() => false, () => true))
// mod がオフか、訳す段落が無ければ頼まない
const asked = (settings: Settings, prose: string[]) => (settings.enabled && prose.length > 0 ? ReplyRequest.of(settings, prose) : undefined)
// 訳のある段落だけを、その訳と段落の番号（at）で
const withTranslation = (p: { text: string; translation?: string }, at: number) => (p.translation ? [{ text: p.text, restated: p.translation, at }] : [])
// 読むのは学ぶ言語の側（学ぶ言語への訳か、学ぶ言語で書かれた本文）。訳の語から絵を出すのは、学ぶ言語への訳で単語の絵がオンのとき
const shaped = (settings: Settings, translated: { text: string; restated: string; at: number }[], value: string) => {
  const isInto = isIntoTarget(settings, value)
  return { translated, spoken: translated.map(p => (isInto ? p.restated : p.text)), withCards: isInto && settings.card }
}
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
// 学ぶ言語へ訳したか（主な言語から訳したか）
const isIntoTarget = ({ native }: Settings, value: string) => /^FROM:(.*)$/m.exec(value)?.[1]?.trim().toLowerCase() === native.trim().toLowerCase()
