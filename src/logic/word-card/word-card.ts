import type { Card, Completion, Shown } from '../../engine-protocol'
import { Result } from '../result/result'
import { CardRequest } from './card-request'

// --- public interface
export const WordCards = {
  words: (restated: string) => words(restated),
  request: (settings: Settings, word: string, restated: string) => request(settings, word, restated),
  of: (reply: Promise<Completion>, pressed: Pressed) => of(reply, pressed),
  saved: (all: unknown, pressed: Pressed) => saved(all, pressed),
  saving: (all: unknown, card: Card, pressed: Pressed) => saving(all, card, pressed),
  up: (shown: readonly Shown[]) => up(shown),
  picture: (svg: string, isWide?: boolean) => picture(svg, isWide),
  waiting: () => waiting(),
}

// --- I/O
type Settings = Parameters<typeof CardRequest.of>[0]
// 押した語と、それがある訳の行
type Pressed = { word: string; restated: string }

// --- operations
// 絵を頼むときは、文の ** を外して渡す
const request = (settings: Settings, word: string, restated: string) => CardRequest.of(settings, word, plain(restated))
// 返事が UNIT / PRON / CAPTION / SVG の形で、句が押した語と関わるときだけ絵にする。それ以外は描けなかったとする
const of = async (reply: Promise<Completion>, pressed: Pressed) => (await Result.given(reply)).and(answered).and(parse).and(card => near(card, pressed)).either<Card | undefined>(card => card, () => undefined)

// --- business rules
// 訳の行は空白で区切った語を、そのまま押せる語にする。押した語は句読点を落とした小文字で渡す（記号だけの語は空）。** の中の語（前の ** が奇数個）は直した所
const words = (restated: string) => restated.split(/\s+/).filter(Boolean).map((w, i, all) => ({ label: plain(w), word: bare(w), isFixed: w.includes('**') || all.slice(0, i).join(' ').split('**').length % 2 === 0 }))
// 直した所の ** は外す
const plain = (text: string) => text.replace(/\*\*/g, '')
// 語は小文字にし、文字・数字と ' と - 以外（句読点など）を落とす
const bare = (word: string) => word.toLowerCase().replace(/[^\p{L}\p{N}'-]/gu, '')
// 句の語（carry on なら carry と on）
const parts = (unit: string) => unit.split(/\s+/).map(bare).filter(Boolean)
// 同じ文の同じ語なら、同じ絵
const key = (word: string, restated: string) => `${word}|${plain(restated)}`
// 描いた絵は、押した語と句のどの語からも引けるように残す（carry の後の on はすぐ出る）
const saving = (all: unknown, card: Card, { word, restated }: Pressed) =>
  ({ ...(all as Record<string, Card> | undefined), ...Object.fromEntries([word, ...parts(card.unit)].map(w => [key(w, restated), card])) })
// 描いた絵は、押した語と文から引く
const saved = (all: unknown, { word, restated }: Pressed) => (all as Record<string, Card> | undefined)?.[key(word, restated)]
// 絵が出ている語は、押した語と、その絵の句のどの語も
const up = (shown: readonly Shown[]) => new Set(shown.flatMap(s => [s.word, ...(s.card ? parts(s.card.unit) : [])]))
// 返事が来れば、その文面。来なければ、その理由で失敗
const answered = (c: Completion) => (c.isAnswered ? c.text : Result.fail(c.reason))
// 返事から句・発音記号・一文・SVG を取り出す。発音記号のほかが欠ければ失敗
const parse = (text: string) => {
  const card = { unit: field(text, 'UNIT'), pron: field(text, 'PRON'), caption: field(text, 'CAPTION'), svg: /<svg[\s\S]*<\/svg>/.exec(text)?.[0] ?? '' }
  return [card.unit, card.caption, card.svg].every(Boolean) ? card : Result.fail('format')
}
// "名前: 値" の行の値
const field = (text: string, name: string) => new RegExp(`^${name}:\\s*(.+)$`, 'm').exec(text)?.[1]?.trim() ?? ''
// 押した語の絵でなければ、描けなかったとする
const near = (card: Card, { word, restated }: Pressed) => (isAstray(card.unit, word, restated) ? Result.fail(card.unit) : card)
// 句がすべて文の別の語なら、押した語の絵ではない（tests を押して carry on）。押した語がその句の語で始まれば活用形として通す（tests → test、swapped → swap over）
const isAstray = (unit: string, word: string, restated: string) => {
  const others = new Set(words(restated).map(w => w.word).filter(w => w && w !== word))
  return parts(unit).every(u => others.has(u) && !word.startsWith(u))
}
// 絵の幅は 380px、拡大で 560px。大きさは SVG にも書き、左に寄せる（Desktop は両方そろって初めて大きさを変える）
const picture = (svg: string, isWide?: boolean) => {
  const width = isWide ? 560 : 380
  const height = width * 0.6
  const source = svg.replace(/<svg\b[^>]*>/, root => `${root.replace(/\s(?:width|height|preserveAspectRatio)="[^"]*"/g, '').slice(0, -1)} width="${width}" height="${height}" preserveAspectRatio="xMinYMid meet">`)
  return { source, width, height }
}
// 描いている間は、同じ大きさの無地の地で場所を取る（届いても、下のボタンと欄が動かない）
const waiting = () => picture('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 288"><rect width="480" height="288" rx="14" fill="#151a2e"/></svg>')
