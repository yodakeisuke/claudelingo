import { atom, read, update } from 'claude-code'
import type { EngineInterface, On, Timer } from 'claude-code'

import type { Card, Shown, Translation } from '../../../engine-protocol'
import { DraftTranslations } from '../../../logic/draft-translation/draft-translation'
import { PromptTranslations } from '../../../logic/prompt-translation/prompt-translation'
import { Result } from '../../../logic/result/result'
import { TranslationSettings } from '../../../logic/translation-settings/translation-settings'
import { WordCards } from '../../../logic/word-card/word-card'
import { draftBand } from '../../ui/draft-band/draft-band'
import { withTranslation } from '../../ui/translation-line/translation-line'
import { wordCard, wordLine } from '../../ui/word-card/word-card'

// 設定パネル（settings.tsx）が $.store に置いた設定。$ は import をまたいで渡せないので、ここでも読む
const settingsOf = async ($: EngineInterface) => TranslationSettings.of(await $.store.get('settings'))

// 指示の鍵（PromptTranslations.key）→ その外国語版。送信のときに作り、行を描くときに引く
const translations = atom({ plugin: 'claudelingo', key: 'translations' } as const, {})
// 指示の鍵 → その下に開いている単語の絵
const cards = atom({ plugin: 'claudelingo', key: 'cards' } as const, {})

// 手順書「指示を外国語で示す」：訳す指示なら言い直しを頼み、行が引けるように残す
const showTranslation = async ($: EngineInterface, from: string, text: string) => {
  const request = PromptTranslations.request(await settingsOf($), { from, text }, (await $.command.list()).map(c => c.name))
  if (!request || !PromptTranslations.isNeeded(await $.session.surfaces())) return
  const translation = await PromptTranslations.of($.model.complete(request))
  await update($, translations, all => ({ ...all, [PromptTranslations.key(text)]: translation }))
  // 訳が届いたらすぐ描き直させる（状態の変化だけでは、面によっては次の描画まで行が出ない）
  $.ui.invalidate('ui.render')
}

// 手順書「単語の絵を出す」：同じ絵が開いていれば閉じ、なければ下に並べる。描いた絵は残し、二度目からはすぐ出す
const pressWord = async ($: EngineInterface, row: string, word: string, restated: string) => {
  const saved = WordCards.saved(await $.store.get('cards'), { word, restated })
  const isSame = (s: Shown) => s.word === word || (saved !== undefined && s.card?.unit === saved.unit)
  if (((await read($, cards))[row] ?? []).some(isSame)) return showCards($, row, list => list.filter(s => !isSame(s)))
  await showCards($, row, list => [...list, { word, card: saved }])
  if (!saved) await drawCard($, row, word, restated)
}

// 押した語の絵を頼む。同じ句の絵が先に出ていれば（swap を押し、続けて over）、後から来た方は捨てる
const drawCard = async ($: EngineInterface, row: string, word: string, restated: string) => {
  const request = WordCards.request(await settingsOf($), word, restated)
  const card = await WordCards.of($.model.complete(request), { word, restated })
  const isUp = card !== undefined && ((await read($, cards))[row] ?? []).some(s => s.word !== word && s.card?.unit === card.unit)
  if (card && !isUp) await saveCard($, card, word, restated)
  await showCards($, row, list => list.flatMap(s => (s.word !== word ? [s] : isUp ? [] : [{ ...s, card, isFailed: !card }])))
}

// 保存領域（設定と共有）があふれたら、それまでの絵を捨てて今の絵だけ残す。それでも失敗したら、出ている絵はそのまま
const saveCard = async ($: EngineInterface, card: Card, word: string, restated: string) => {
  const save = (all: unknown) => $.store.set('cards', WordCards.saving(all, card, { word, restated }))
  const isSaved = (await Result.given(save(await $.store.get('cards')))).either(() => true, () => false)
  if (!isSaved) await Result.given(save(undefined))
}

// 開いている絵は置き換えで変える（中を書き換えると Desktop が描き直さない）
const showCards = async ($: EngineInterface, row: string, change: (list: Shown[]) => Shown[]) => {
  await update($, cards, all => ({ ...all, [row]: change(all[row] ?? []) }))
  $.ui.invalidate('ui.render')
}

// 打ちかけと、その校正。まだ無いときは null
const draft = atom({ plugin: 'claudelingo', key: 'draft' } as const, null)
// 打つ手が止まるのを待つタイマーと、走っている依頼の止め手。次の打鍵で両方やめる
let pause: Timer | undefined
let stop = new AbortController()

// 手順書「打ちかけを外国語で示す」：打つ手が止まったら 1 回だけ頼み、その間に打たれたら捨てる
const showDraftTranslation = async ($: EngineInterface, text: string, signal: AbortSignal) => {
  const request = DraftTranslations.request(await settingsOf($), text, (await $.command.list()).map(c => c.name))
  const version = request && (await PromptTranslations.of($.model.complete(request, { signal })))
  const shown = version ? { text, version } : null
  if (signal.aborted) return
  await update($, draft, () => shown)
  $.ui.invalidate('ui.render')
  if (shown) await underlineNow($, shown, signal)
}

// 赤線は打鍵の応答か fill でしか付かない。校正が届いたら、同じ文面を fill し直して赤線だけ付ける
// 文字もカーソルも変わらないよう、入力欄が校正した下書きのままで、カーソルが末尾のときだけ
const underlineNow = async ($: EngineInterface, shown: { text: string; version: Translation }, signal: AbortSignal) => {
  const box = await $.prompt.read()
  if (signal.aborted) return
  const decorations = underlines(box.text, shown.version)
  if (box.text === shown.text && box.cursor === box.text.length && decorations.length > 0) await $.prompt.fill({ text: box.text, mode: 'replace', decorations })
}

const underlines = (text: string, version: Translation) => DraftTranslations.marks(text, version).map(range => ({ ...range, color: 'error', underline: true }))

const cancelDraftTranslation = () => {
  pause?.cancel()
  stop.abort()
}

const translateAfterPause = async ($: EngineInterface, text: string) => {
  cancelDraftTranslation()
  const own = new AbortController()
  stop = own
  const { livePause } = await settingsOf($)
  if (!own.signal.aborted) pause = $.clock.after(Number(livePause) * 1000, () => void showDraftTranslation($, text, own.signal))
}

// 送ったら、入力欄が空になるのに合わせて帯もすぐ消す
const hideDraftTranslation = async ($: EngineInterface) => {
  cancelDraftTranslation()
  await update($, draft, () => null)
  $.ui.invalidate('ui.render')
}

export const translation = (on: On) => {
  on('prompt.submit', ($, e, next) => {
    // 送信は待たせない。訳は自分の dispatch で走らせる
    $.clock.after(0, () => void showTranslation($, e.origin.kind, e.text.trim()))
    // 自分で送ったら下書きは空になる。通知などの送信では、打ちかけの帯を残す
    if (PromptTranslations.isOwn(e.origin.kind)) $.clock.after(0, () => void hideDraftTranslation($))
    return next(e)
  })

  on('prompt.edit', async ($, e, next) => {
    const box = await next(e)
    if (box.text !== e.text) void translateAfterPause($, box.text)
    // 校正で直した所が下書きに残っていれば、入力欄のその文字に赤い下線（文字は変えない）
    const shown = await read($, draft)
    return { ...box, decorations: [...(box.decorations ?? []), ...(shown ? underlines(box.text, shown.version) : [])] }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const shown = await read($, draft)
    const settings = await settingsOf($)
    if (!shown || e.props.hasSurvey || !settings.enabled || !settings.live) return next(e)
    const line = DraftTranslations.line(shown.version)
    const replacement = DraftTranslations.replacement(shown.text, shown.version)
    if (!line) return next(e)
    // 置き換えるのは、校正した打ちかけのままのときだけ（待ちの間に打たれていたら、古い言い直しになる）
    const replace = async (text: string) => {
      if ((await $.prompt.read()).text.trim() !== shown.text.trim()) return
      const { isFilled } = await $.prompt.fill({ text, mode: 'replace' })
      if (isFilled) void translateAfterPause($, text)
    }
    return draftBand($.ui.resolve(e), line, replacement ? () => void replace(replacement) : undefined)
  })

  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    const row = await next(e)
    const key = PromptTranslations.key(e.props.text)
    const version = (await read($, translations))[key]
    const line = PromptTranslations.line(version)
    if (!line) return row
    const t = $.ui.resolve(e)
    if (!Result.given(version).either(() => true, () => false) || !(await settingsOf($)).card) return withTranslation(t, row, line)
    // 単語の絵がオンなら、訳の行の語を押すとその語の絵が下に出る
    const shown = (await read($, cards))[key] ?? []
    const isTerminal = e.surface === 'terminal'
    const words = wordLine(t, isTerminal, WordCards.words(line.restated), WordCards.up(shown), word => void pressWord($, key, word, line.restated))
    return withTranslation(t, row, line, words, shown.map(s => wordCard(t, isTerminal, s, isWide => void showCards($, key, list => list.map(o => (o.word === s.word ? { ...o, isWide } : o))))))
  })
}
