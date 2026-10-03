import type { Completion, Translation } from '../../engine-protocol'
import { Result } from '../result/result'
import { ReplyRequest } from './reply-request'

// --- public interface
export const ReplyTranslations = {
  request: (settings: Settings, text: string) => request(settings, text),
  of: (reply: Promise<Completion>) => of(reply),
  shown: (text: string, version: Translation) => shown(text, version),
}

// --- I/O
type Settings = Parameters<typeof ReplyRequest.of>[0]

// --- operations
// 訳すのはコードでない段落だけ
const request = (settings: Settings, text: string) => ReplyRequest.of(settings, paragraphs(text).filter(p => !isCode(p)))
// 返事が来ればその文面、来なければその理由
const of = async (reply: Promise<Completion>): Promise<Translation> => (await Result.given(reply)).and(answered).either<Translation>(value => ({ ok: true, value }), error => ({ ok: false, error }))
// 段落ごとに訳を添える。訳せなかったら段落はそのままで、その理由を添える
const shown = (text: string, version: Translation) =>
  Result.given(version).either(value => ({ paragraphs: paired(text, value), isIntoTarget: isIntoTarget(value), error: '' }), (error: string) => ({ paragraphs: paired(text, ''), isIntoTarget: false, error }))

// --- business rules
// 段落は空行で区切る。コードブロックの中の空行では切らない
const paragraphs = (text: string) =>
  text.split(/\n[ \t]*\n/).reduce<string[]>((list, chunk) => (isOpen(list.at(-1)) ? [...list.slice(0, -1), `${list.at(-1)}\n\n${chunk}`] : [...list, chunk]), []).map(p => p.trim()).filter(Boolean)
// ``` が奇数個なら、コードブロックが閉じていない
const isOpen = (paragraph?: string) => (paragraph?.match(/^\s*```/gm)?.length ?? 0) % 2 === 1
// ``` で始まる段落はコード
const isCode = (paragraph: string) => /^\s*```/.test(paragraph)
// [n] の訳を、コードでない段落に順に当てる（コードの段落と、訳が欠けた段落には無い）
const paired = (text: string, value: string) => {
  const all = paragraphs(text)
  const translations = value.split(/^\[\d+\]\s*/m).slice(1).map(t => t.trim())
  return all.map((p, i) => ({ text: p, translation: isCode(p) ? undefined : translations[all.slice(0, i).filter(q => !isCode(q)).length] }))
}
// 学ぶ言語へ訳したか
const isIntoTarget = (value: string) => /^INTO:\s*TARGET/m.test(value)
// 返事が来れば、その文面。来なければ、その理由で失敗
const answered = (c: Completion) => (c.isAnswered ? c.text : Result.fail(c.reason))
