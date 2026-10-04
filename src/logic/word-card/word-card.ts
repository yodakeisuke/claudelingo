import type { Answer, Card, OpenCard } from '../../engine-protocol'
import { Restatements } from '../restatement/restatement'
import { Result } from '../result/result'
import { CardRequest } from './card-request'

// --- public interface
export const WordCards = {
  words: (restated: string) => words(restated),
  request: (settings: Settings, pressed: Pressed, surfaces: readonly string[]) => request(settings, pressed, surfaces),
  of: (answer: Answer, pressed: Pressed) => of(answer, pressed),
  saved: (all: Drawn, pressed: Pressed) => saved(all, pressed),
  saving: (all: Drawn, card: Card, pressed: Pressed) => saving(all, card, pressed),
  openedUnits: (opened: readonly OpenCard[]) => openedUnits(opened),
  picture: (svg: string, isWide?: boolean) => picture(svg, isWide),
  waiting: () => waiting(),
}

// --- I/O
type Settings = Parameters<typeof CardRequest.of>[0]
// 押した語と、それがある訳の行
type Pressed = { word: string; restated: string }
// 描いた絵：押した語と文の鍵 → 絵
type Drawn = Record<string, Card>

// --- operations
// 絵を頼むときは、文の ** を外して渡す。SVG は、絵を描ける面があるときだけ頼む
const request = (settings: Settings, { word, restated }: Pressed, surfaces: readonly string[]) => CardRequest.of(settings, { word, sentence: Restatements.plain(restated) }, isPictured(surfaces))
// 答え（Answers.of で受けたもの）に UNIT / CAPTION がそろい（PRON と SVG は無くてもよい）、句が押した語と関わるときだけ絵にする。それ以外は描けなかったとする
const of = (answer: Answer, pressed: Pressed) => Result.given(answer).and(parse).and(card => near(card, pressed)).either<Card | undefined>(card => card, () => undefined)

// --- business rules
// 訳の行は空白で区切った語を、そのまま押せる語にする。押した語は句読点を落とした小文字で渡す（記号だけの語は空）。直した所（** の対）は印 \u0001 で囲んでから区切り、前の印が奇数個の語を直した所とする
const words = (restated: string) => Restatements.parts(restated).join('\u0001').split(/\s+/).filter(Boolean).map((w, i, all) => ({ label: w.replaceAll('\u0001', ''), word: bare(w), isFixed: w.includes('\u0001') || all.slice(0, i).join(' ').split('\u0001').length % 2 === 0 }))
// 語は小文字にし、文字（母音記号などの結合文字も）・数字と ' と - 以外（句読点など）を落とす。’ は ' にそろえ、語の両端の ' は引用符として落とす。' と - だけが残る語（- や ---）は空
const bare = (word: string) => word.toLowerCase().replaceAll('’', "'").replace(/[^\p{L}\p{M}\p{N}'-]/gu, '').replace(/^'+|'+$/g, '').replace(/^['-]+$/, '')
// 句の語（carry on なら carry と on）
const parts = (unit: string) => unit.split(/\s+/).map(bare).filter(Boolean)
// 同じ文の同じ語なら、同じ絵
const key = (word: string, restated: string) => `${word}|${Restatements.plain(restated)}`
// 描いた絵は、押した語と句のどの語からも引けるように残す（carry の後の on はすぐ出る）
const saving = (all: Drawn, card: Card, { word, restated }: Pressed) => ({ ...all, ...Object.fromEntries([word, ...parts(card.unit)].map(w => [key(w, restated), card])) })
// 描いた絵は、押した語と文から引く
const saved = (all: Drawn, { word, restated }: Pressed) => all[key(word, restated)]
// 絵が出ている語（押した語と、その絵の句のどの語も）→ その絵の句（描いている間は押した語）。同じ句の語と絵の見出しは一緒に光る
const openedUnits = (opened: readonly OpenCard[]) => new Map(opened.flatMap(s => [s.word, ...(s.card ? parts(s.card.unit) : [])].map(w => [w, s.card?.unit ?? s.word])))
// 絵を描ける面（端末のほか）が 1 つでもあれば、SVG も頼む
const isPictured = (surfaces: readonly string[]) => surfaces.some(s => s !== 'terminal')
// 返事から句・発音記号・一文・SVG を取り出す。句か一文が欠けるか、SVG が外を参照しうれば失敗（図形とアニメーション以外の要素（<img> などは SVG を抜けて HTML になる）、href、style 属性、文書の外への url()、image-set、それを隠す & と \。訳した文に混じった指示で、絵から外へ送らせない）
const parse = (text: string) => {
  const card = { unit: field(text, 'UNIT'), pron: field(text, 'PRON'), caption: field(text, 'CAPTION'), svg: /<svg[\s\S]*<\/svg>/.exec(text)?.[0] ?? '' }
  return [card.unit, card.caption].every(Boolean) && !/<(?!\/?(?:svg|g|defs|marker|clipPath|mask|pattern|linearGradient|radialGradient|stop|rect|circle|ellipse|line|polyline|polygon|path|text|tspan|title|desc|animate|animateTransform|animateMotion|set)[\s/>])|href|(?<![\w-])style\s*=|url\((?!\s*['"]?#)|image-set|&|\\/i.test(card.svg) ? card : Result.fail('format')
}
// "名前: 値" の行の値
const field = (text: string, name: string) => new RegExp(`^${name}:[ \\t]*(.+)$`, 'm').exec(text)?.[1]?.trim() ?? ''
// 押した語の絵でなければ、描けなかったとする
const near = (card: Card, { word, restated }: Pressed) => (isAstray(card.unit, word, restated) ? Result.fail(card.unit) : card)
// 句がすべて文の別の語なら、押した語の絵ではない（tests を押して carry on）。押した語がその句の語で始まれば活用形として通す（tests → test、swapped → swap over）
const isAstray = (unit: string, word: string, restated: string) => {
  const others = new Set(words(restated).map(w => w.word).filter(w => w && w !== word))
  return parts(unit).every(u => others.has(u) && !word.startsWith(u))
}
// 絵の幅は 380px、拡大で 560px。大きさは SVG にも書き、左に寄せる（Desktop は両方そろって初めて大きさを変える）。出るときは 0.4 秒で浮かび上がる
const picture = (svg: string, isWide?: boolean) => {
  const width = isWide ? 560 : 380
  const height = width * 0.6
  const source = svg.replace(/<svg\b[^>]*>/, root => `${root.replace(/\s(?:width|height|preserveAspectRatio)="[^"]*"/g, '').slice(0, -1)} width="${width}" height="${height}" preserveAspectRatio="xMinYMid meet"><animate attributeName="opacity" from="0" to="1" dur="0.4s"/>`)
  return { source, width, height }
}
// 描いている間は、同じ大きさの地で場所を取る（届いても、下のボタンと欄が動かない）。地の真ん中で輪を描き続け、止まっていないと分かるように
const waiting = () => picture('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 288"><rect width="480" height="288" rx="14" fill="#151a2e"/><circle cx="240" cy="144" r="28" fill="none" stroke="#7d84a3" stroke-width="3" stroke-dasharray="176"><animate attributeName="stroke-dashoffset" values="176;0" dur="2.4s" repeatCount="indefinite"/></circle></svg>')
