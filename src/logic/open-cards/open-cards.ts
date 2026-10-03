import type { Aspect, Card, Item, Opened, Shown } from '../../engine-protocol'

// --- public interface
export const OpenCards = {
  pressed: (list: readonly Shown[], word: string, saved?: Card) => pressed(list, word, saved),
  isDrawing: (list: readonly Shown[], word: string) => isDrawing(list, word),
  kept: (list: readonly Shown[], word: string, card?: Card) => kept(list, word, card),
  drawn: (list: readonly Shown[], word: string, card?: Card) => drawn(list, word, card),
  resized: (list: readonly Shown[], word: string, isWide: boolean) => resized(list, word, isWide),
  aspectPressed: (list: readonly Shown[], at: At) => aspectPressed(list, at),
  isWriting: (list: readonly Shown[], at: At) => isWriting(list, at),
  written: (list: readonly Shown[], at: At, items?: Item[]) => written(list, at, items),
}

// --- I/O
// 欄の場所：押した語と、その欄
type At = { word: string; aspect: Aspect }

// --- business rules
// 押した語の絵が開いていれば閉じ、なければ下に並べる（その語で描いた絵があれば、それで）
const pressed = (list: readonly Shown[], word: string, saved?: Card) =>
  (list.some(s => isSame(s, word, saved)) ? list.filter(s => !isSame(s, word, saved)) : [...list, { word, card: saved }])
// 同じ絵とみなすのは、同じ語か、同じ句の絵
const isSame = (s: Shown, word: string, saved?: Card) => s.word === word || (saved !== undefined && s.card?.unit === saved.unit)
// 絵が無いまま開いた語は、描きに行く
const isDrawing = (list: readonly Shown[], word: string) => list.some(s => s.word === word && !s.card && !s.isFailed)
// 届いた絵を残すのは、同じ句の絵がまだ出ていないとき
const kept = (list: readonly Shown[], word: string, card?: Card) => (card && !isUp(list, word, card) ? card : undefined)
// 届いた絵を語に入れ、描けなければ失敗とする。もう絵が出ていればそのまま（閉じて開き直すと、先の依頼も後から届く）。同じ句の絵が先に出ていれば（swap を押し、続けて over）、後から来た方を閉じる
const drawn = (list: readonly Shown[], word: string, card?: Card) =>
  list.flatMap(s => (s.word !== word || s.card ? [s] : card && isUp(list, word, card) ? [] : [{ ...s, card, isFailed: !card }]))
// 同じ句の絵が、別の語で出ている
const isUp = (list: readonly Shown[], word: string, card: Card) => list.some(s => s.word !== word && s.card?.unit === card.unit)
// 拡大・縮小はその絵だけ
const resized = (list: readonly Shown[], word: string, isWide: boolean) => list.map(s => (s.word === word ? { ...s, isWide } : s))
// 欄は、開いていれば閉じ、閉じていれば書いている間の空の欄で開く
const aspectPressed = (list: readonly Shown[], at: At) => changeAspect(list, at, opened => (opened ? undefined : {}))
// 空の欄が開いたら、書きに行く
const isWriting = (list: readonly Shown[], { word, aspect }: At) => {
  const opened = list.find(s => s.word === word)?.aspects?.[aspect]
  return opened !== undefined && !opened.items && !opened.isFailed
}
// 書けた欄は項目で、書けなければ失敗で埋める。もう項目が出ていればそのまま。書いている間に閉じられていたら、開き直さない
const written = (list: readonly Shown[], at: At, items?: Item[]) => changeAspect(list, at, opened => opened && (opened.items ? opened : { items, isFailed: !items }))
// 押した語の欄だけを変える
const changeAspect = (list: readonly Shown[], { word, aspect }: At, change: (opened?: Opened) => Opened | undefined) =>
  list.map(s => (s.word === word ? { ...s, aspects: { ...s.aspects, [aspect]: change(s.aspects?.[aspect]) } } : s))
