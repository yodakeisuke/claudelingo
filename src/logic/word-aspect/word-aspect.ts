import type { Aspect, Completion, Item } from '../../engine-protocol'
import { PromptTranslations } from '../prompt-translation/prompt-translation'
import { Result } from '../result/result'
import { AspectRequest } from './aspect-request'

// --- public interface
export const WordAspects = {
  all: () => all(),
  request: (settings: Settings, aspect: Aspect, pressed: Pressed) => request(settings, aspect, pressed),
  of: (reply: Promise<Completion>, aspect: Aspect) => of(reply, aspect),
}

// --- I/O
type Settings = Parameters<typeof AspectRequest.of>[0]
// 押した語と、それがある訳の行
type Pressed = { word: string; restated: string }

// --- operations
// 頼むときは、文の直した所の ** を外して渡す
const request = (settings: Settings, aspect: Aspect, { word, restated }: Pressed) => AspectRequest.of(settings, aspect, { word, sentence: PromptTranslations.plain(restated) })
// 返事を項目に分ける。答えがないか、項目が 1 つもなければ書けなかったとする
const of = async (reply: Promise<Completion>, aspect: Aspect) =>
  (await Result.given(reply)).and(answered).and(text => parse(text, aspect)).either<Item[] | undefined>(items => items, () => undefined)

// --- business rules
// 欄は例文・類似表現・語源の順に並べる
const all = (): Aspect[] => ['examples', 'similar', 'origin']
// 返事が来れば、その文面。来なければ、その理由で失敗
const answered = (c: Completion) => (c.isAnswered ? c.text : Result.fail(c.reason))
// 欄ごとの "名前: 値" の行。本文の名前で項目を始め、添える行の名前はその項目の下に足す
const tags = (aspect: Aspect) => ({
  examples: { head: 'EX', notes: ['TR', 'FEEL'] },
  similar: { head: 'ALT', notes: ['USE'] },
  origin: { head: 'ROOTS', notes: ['STORY'] },
})[aspect]
// 返事を行ごとに項目へ。1 つもなければ形が違うとする
const parse = (text: string, aspect: Aspect) => {
  const items = text.split('\n').reduce<Item[]>((items, line) => add(items, line, aspect), [])
  return items.length > 0 ? items : Result.fail('format')
}
// 本文の行なら新しい項目、添える行なら直前の項目に足す。どちらでもない行は捨てる
const add = (items: Item[], line: string, aspect: Aspect) => {
  const { name, value } = field(line)
  if (name === tags(aspect).head) return [...items, { text: value, notes: [] }]
  return tags(aspect).notes.includes(name) ? noted(items, value) : items
}
// 添える行は直前の項目の下に。項目より前の添える行は捨てる
const noted = (items: Item[], value: string) => [...items.slice(0, -1), ...items.slice(-1).map(last => ({ ...last, notes: [...last.notes, value] }))]
// "名前: 値" の行の名前と値（そうでない行は名前が空）
const field = (line: string) => {
  const [, name = '', value = ''] = /^([A-Z]+):\s*(.+)$/.exec(line.trim()) ?? []
  return { name, value }
}
