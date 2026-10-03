import type { Card, Completion, Shown } from '../../engine-protocol'
import { Result } from '../result/result'
import { CardRequest } from './card-request'

// --- 公開する操作
export const WordCards = {
  words: (restated: string) => words(restated),
  request: (settings: Settings, word: string, restated: string) => CardRequest.of(settings, word, plain(restated)),
  of: (reply: Promise<Completion>, pressed: Pressed) => of(reply, pressed),
  saved: (all: unknown, pressed: Pressed) => (all as Saved | undefined)?.[key(pressed.word, pressed.restated)],
  saving: (all: unknown, card: Card, pressed: Pressed) => saving(all, card, pressed),
  up: (shown: readonly Shown[]) => new Set(shown.flatMap(s => [s.word, ...(s.card ? parts(s.card.unit) : [])])),
  picture: (svg: string, isWide?: boolean) => picture(svg, isWide),
}

// --- データ構造
type Settings = Parameters<typeof CardRequest.of>[0]
// 押した語と、それがある訳の行
type Pressed = { word: string; restated: string }
// 描いた絵の保存：押した語と文 → 絵
type Saved = Record<string, Card>

// --- ビジネスルール
// 訳の行は空白で区切った語を、そのまま押せる語にする。押した語は句読点を落とした小文字で渡す（記号だけの語は空）
const words = (restated: string) => restated.split(/\s+/).filter(Boolean).map(w => ({ label: plain(w), word: bare(w) }))
// 直した所の ** は外す
const plain = (text: string) => text.replace(/\*\*/g, '')
// 語は小文字にし、文字・数字と ' と - 以外（句読点など）を落とす
const bare = (word: string) => word.toLowerCase().replace(/[^\p{L}\p{N}'-]/gu, '')
// 句の語（carry on なら carry と on）
const parts = (unit: string) => unit.split(/\s+/).map(bare).filter(Boolean)
// 同じ文の同じ語なら、同じ絵
const key = (word: string, restated: string) => `${word}|${plain(restated)}`
// 描いた絵は、押した語と句のどの語からも引けるように残す（carry の後の on はすぐ出る）
const saving = (all: unknown, card: Card, { word, restated }: Pressed): Saved =>
  ({ ...(all as Saved | undefined), ...Object.fromEntries([word, ...parts(card.unit)].map(w => [key(w, restated), card])) })
// 返事が UNIT / CAPTION / SVG の形で、句が押した語と関わるときだけ絵にする。それ以外は描けなかったとする
const of = async (reply: Promise<Completion>, { word, restated }: Pressed): Promise<Card | undefined> =>
  (await Result.given(reply))
    .and(c => (c.isAnswered ? parse(c.text) : Result.fail(c.reason)))
    .and(card => (isAstray(card.unit, word, restated) ? Result.fail(card.unit) : card))
    .either<Card | undefined>(card => card, () => undefined)
// 返事から句・一文・SVG を取り出す。どれか欠ければ失敗
const parse = (text: string) => {
  const card = { unit: field(text, 'UNIT'), caption: field(text, 'CAPTION'), svg: /<svg[\s\S]*<\/svg>/.exec(text)?.[0] ?? '' }
  return Object.values(card).every(Boolean) ? card : Result.fail('format')
}
// "名前: 値" の行の値
const field = (text: string, name: string) => new RegExp(`^${name}:\\s*(.+)$`, 'm').exec(text)?.[1]?.trim() ?? ''
// 句がすべて文の別の語なら、押した語の絵ではない（tests を押して carry on）。活用形の違いは通す（swapped → swap over）
const isAstray = (unit: string, word: string, restated: string) => {
  const others = new Set(words(restated).map(w => w.word).filter(w => w && w !== word))
  return parts(unit).every(u => others.has(u))
}
// 絵の幅は 380px、拡大で 560px。大きさは SVG にも書き、左に寄せる（Desktop は両方そろって初めて大きさを変える）
const picture = (svg: string, isWide?: boolean) => {
  const width = isWide ? 560 : 380
  const height = width * 0.6
  const source = svg.replace(/<svg\b[^>]*>/, root => `${root.replace(/\s(?:width|height|preserveAspectRatio)="[^"]*"/g, '').slice(0, -1)} width="${width}" height="${height}" preserveAspectRatio="xMinYMid meet">`)
  return { source, width, height }
}
