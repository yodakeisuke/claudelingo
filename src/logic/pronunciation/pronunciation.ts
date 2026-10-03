import type { Translation } from '../../engine-protocol'
import { PromptTranslations } from '../prompt-translation/prompt-translation'
import { Result } from '../result/result'
import { PronunciationRequest } from './pronunciation-request'

// --- public interface
export const Pronunciations = {
  key: (lines: readonly string[]) => key(lines),
  spoken: (lines: readonly string[]) => spoken(lines),
  request: (settings: Settings, lines: readonly string[]) => request(settings, lines),
  of: (version: Translation) => of(version),
}

// --- I/O
type Settings = Parameters<typeof PronunciationRequest.of>[0]

// --- operations
// 読み上げた文の ** を外して頼む
const request = (settings: Settings, lines: readonly string[]) => PronunciationRequest.of(settings, spoken(lines))
// 返事（PromptTranslations.of で受けたもの）が来れば文ごとの記号、来なければ記号なし
const of = (version: Translation) => Result.given(version).and(symbols).either<string[] | undefined>(s => s, () => undefined)

// --- business rules
// 同じ文の並びなら、同じ記号
const key = (lines: readonly string[]) => spoken(lines).join('\n')
// 読ませる文は、直した所の ** を外したもの
const spoken = (lines: readonly string[]) => lines.map(PromptTranslations.plain)
// [n] の記号を n 番目の文に（欠けた番号は空）。[n] が / の中にあっても読み、どの行にも無ければ / で始まる行を順に。1 つも無ければ形が違うとする
const symbols = (text: string) => {
  const lines = text.split('\n').map(l => l.trim()).map(symbolLine)
  const numbered = lines.some(l => l.n > 0) ? lines.filter(l => l.n > 0) : lines.filter(l => l.isSlashed).map((l, i) => ({ ...l, n: i + 1 }))
  const byNumber = new Map(numbered.map(l => [l.n, l.symbol] as const))
  return byNumber.size > 0 ? Array.from({ length: Math.max(...byNumber.keys()) }, (_, k) => byNumber.get(k + 1) ?? '') : Result.fail('format')
}
// 1 行の番号（無ければ 0）と、/ で囲み直した記号
const symbolLine = (line: string) => {
  const symbol = line.replace(/^\/?\[\d+\]/, '').replaceAll('/', '').trim()
  return { n: Number(/^\/?\[(\d+)\]/.exec(line)?.[1] ?? 0), isSlashed: line.startsWith('/'), symbol: symbol && `/${symbol}/` }
}
