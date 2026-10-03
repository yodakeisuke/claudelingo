import type { Aspect, Card, Item, OpenAspect, OpenCard } from '../../engine-protocol'

// --- public interface
export const OpenCards = {
  pressed: (list: readonly OpenCard[], word: string, saved?: Card) => pressed(list, word, saved),
  isDrawing: (list: readonly OpenCard[], word: string) => isDrawing(list, word),
  kept: (list: readonly OpenCard[], word: string, card?: Card) => kept(list, word, card),
  drawn: (list: readonly OpenCard[], word: string, card?: Card) => drawn(list, word, card),
  resized: (list: readonly OpenCard[], word: string, isWide: boolean) => resized(list, word, isWide),
  aspectPressed: (list: readonly OpenCard[], at: WordAspect) => aspectPressed(list, at),
  isWriting: (list: readonly OpenCard[], at: WordAspect) => isWriting(list, at),
  written: (list: readonly OpenCard[], at: WordAspect, items?: Item[]) => written(list, at, items),
}

// --- I/O
// どの語の、どの欄か
type WordAspect = { word: string; aspect: Aspect }

// --- business rules
// 押した語の絵が開いていれば閉じ、なければ下に並べる（その語で描いた絵があれば、それで）
const pressed = (list: readonly OpenCard[], word: string, saved?: Card) =>
  (list.some(s => isSame(s, word, saved)) ? list.filter(s => !isSame(s, word, saved)) : [...list, { word, card: saved }])
// 同じ絵とみなすのは、同じ語か、同じ句の絵
const isSame = (s: OpenCard, word: string, saved?: Card) => s.word === word || (saved !== undefined && s.card?.unit === saved.unit)
// 絵が無いまま開いた語は、描きに行く
const isDrawing = (list: readonly OpenCard[], word: string) => list.some(s => s.word === word && !s.card && !s.isFailed)
// 届いた絵を残すのは、同じ句の絵がまだ出ていないとき
const kept = (list: readonly OpenCard[], word: string, card?: Card) => (card && !isUp(list, word, card) ? card : undefined)
// 届いた絵を語に入れ、描けなければ失敗とする。もう絵が出ていればそのまま（閉じて開き直すと、先の依頼も後から届く）。同じ句の絵が先に出ていれば（swap を押し、続けて over）、後から来た方を閉じる
const drawn = (list: readonly OpenCard[], word: string, card?: Card) =>
  list.flatMap(s => (s.word !== word || s.card ? [s] : card && isUp(list, word, card) ? [] : [{ ...s, card, isFailed: !card }]))
// 同じ句の絵が、別の語で出ている
const isUp = (list: readonly OpenCard[], word: string, card: Card) => list.some(s => s.word !== word && s.card?.unit === card.unit)
// 拡大・縮小はその絵だけ
const resized = (list: readonly OpenCard[], word: string, isWide: boolean) => list.map(s => (s.word === word ? { ...s, isWide } : s))
// 欄は、開いていれば閉じ、閉じていれば書いている間の空の欄で開く
const aspectPressed = (list: readonly OpenCard[], at: WordAspect) => changeAspect(list, at, opened => (opened ? undefined : {}))
// 空の欄が開いたら、書きに行く
const isWriting = (list: readonly OpenCard[], { word, aspect }: WordAspect) => {
  const opened = list.find(s => s.word === word)?.aspects?.[aspect]
  return opened !== undefined && !opened.items && !opened.isFailed
}
// 書けた欄は項目で、書けなければ失敗で埋める。もう項目が出ていればそのまま。書いている間に閉じられていたら、開き直さない
const written = (list: readonly OpenCard[], at: WordAspect, items?: Item[]) => changeAspect(list, at, opened => opened && (opened.items ? opened : { items, isFailed: !items }))
// 押した語の欄だけを変える
const changeAspect = (list: readonly OpenCard[], { word, aspect }: WordAspect, change: (opened?: OpenAspect) => OpenAspect | undefined) =>
  list.map(s => (s.word === word ? { ...s, aspects: { ...s.aspects, [aspect]: change(s.aspects?.[aspect]) } } : s))
