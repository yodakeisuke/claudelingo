import { atom, read, update } from 'claude-code'
import type { EngineInterface, On, Timer } from 'claude-code'

import type { Aspect, Opened, Shown, Translation } from '../../../engine-protocol'
import { DraftTranslations } from '../../../logic/draft-translation/draft-translation'
import { PromptTranslations } from '../../../logic/prompt-translation/prompt-translation'
import { ReplyTranslations } from '../../../logic/reply-translation/reply-translation'
import { Result } from '../../../logic/result/result'
import { TranslationSettings } from '../../../logic/translation-settings/translation-settings'
import { WordAspects } from '../../../logic/word-aspect/word-aspect'
import { WordCards } from '../../../logic/word-card/word-card'
import { draftBand } from '../../ui/draft-band/draft-band'
import { replyBlock } from '../../ui/reply-translation/reply-translation'
import { withTranslation } from '../../ui/translation-line/translation-line'
import { wordCard, wordLine } from '../../ui/word-card/word-card'

// 設定パネル（settings.tsx）が $.store に置いた設定。$ は import をまたいで渡せないので、ここでも読む
const settingsOf = async ($: EngineInterface) => TranslationSettings.of(await $.store.get('settings'))

// 指示の鍵（PromptTranslations.key）→ その外国語版。送信のときに作り、行を描くときに引く
const translations = atom({ plugin: 'claudelingo', key: 'translations' } as const, {})
// 指示の鍵 → その下に開いている単語の絵
const cards = atom({ plugin: 'claudelingo', key: 'cards' } as const, {})
// 描いた絵（WordCards.saving の形）。ディスクには置かず、セッションの間だけ持つ
const drawn = atom({ plugin: 'claudelingo', key: 'drawn' } as const, {})

// 手順書「指示を外国語で示す」：訳す指示なら言い直しを頼み、行が引けるように残す
const showTranslation = async ($: EngineInterface, from: string, text: string) => {
  const request = PromptTranslations.request(await settingsOf($), { from, text }, (await $.command.list()).map(c => c.name))
  if (!request || !PromptTranslations.isNeeded(await $.session.surfaces())) return
  const translation = await PromptTranslations.of($.model.complete(request))
  await update($, translations, all => ({ ...all, [PromptTranslations.key(text)]: translation }))
  // 訳が届いたらすぐ描き直させる（状態の変化だけでは、面によっては次の描画まで行が出ない）
  $.ui.invalidate('ui.render')
}

// 手順書「単語の絵を出す」：同じ絵が開いていれば閉じ、なければ下に並べる。描いた絵はセッションの間残し、二度目からはすぐ出す
const pressWord = async ($: EngineInterface, row: string, word: string, restated: string) => {
  const saved = WordCards.saved(await read($, drawn), { word, restated })
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
  if (card && !isUp) await update($, drawn, all => WordCards.saving(all, card, { word, restated }))
  await showCards($, row, list => list.flatMap(s => (s.word !== word ? [s] : isUp ? [] : [{ ...s, card, isFailed: !card }])))
}

// 手順書「語を深める」：開いている欄なら閉じ、なければ開いて書かせる。絵とは別に頼むので、描いている間も押せる
const pressAspect = async ($: EngineInterface, row: string, word: string, restated: string, aspect: Aspect) => {
  const isOpen = ((await read($, cards))[row] ?? []).some(s => s.word === word && s.aspects?.[aspect])
  await changeAspect($, row, word, aspect, () => (isOpen ? undefined : {}))
  if (isOpen) return
  const items = await WordAspects.of($.model.complete(WordAspects.request(await settingsOf($), aspect, { word, restated })), aspect)
  // 書いている間に閉じられていたら、開き直さない
  await changeAspect($, row, word, aspect, opened => opened && { items, isFailed: !items })
}

const changeAspect = ($: EngineInterface, row: string, word: string, aspect: Aspect, change: (opened?: Opened) => Opened | undefined) =>
  showCards($, row, list => list.map(s => (s.word === word ? { ...s, aspects: { ...s.aspects, [aspect]: change(s.aspects?.[aspect]) } } : s)))

// 開いている絵は置き換えで変える（中を書き換えると Desktop が描き直さない）
const showCards = async ($: EngineInterface, row: string, change: (list: Shown[]) => Shown[]) => {
  await update($, cards, all => ({ ...all, [row]: change(all[row] ?? []) }))
  $.ui.invalidate('ui.render')
}

// 開いている絵を描く。拡大・縮小と欄はその絵だけ
const cardsOf = ($: EngineInterface, t: Parameters<typeof wordCard>[0], isTerminal: boolean, row: string, restated: string, shown: Shown[]) =>
  shown.map(s => wordCard(t, isTerminal, s, isWide => void showCards($, row, list => list.map(o => (o.word === s.word ? { ...o, isWide } : o))), aspect => void pressAspect($, row, s.word, restated, aspect)))

// 返事の文面 → その訳。訳している間は null。閉じたら消す
const replies = atom({ plugin: 'claudelingo', key: 'replies' } as const, {})

// 手順書「返事を訳す」：押したら訳を頼み、届いたら段落ごとに添える
const translateReply = async ($: EngineInterface, text: string) => {
  await showReply($, text, null)
  await showReply($, text, await ReplyTranslations.of($.model.complete(ReplyTranslations.request(await settingsOf($), text))))
}

const showReply = async ($: EngineInterface, text: string, version?: Translation | null) => {
  await update($, replies, all => (version === undefined ? Object.fromEntries(Object.entries(all).filter(([k]) => k !== text)) : { ...all, [text]: version }))
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
    return withTranslation(t, row, line, words, cardsOf($, t, isTerminal, key, line.restated, shown))
  })

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    const settings = await settingsOf($)
    const text = e.props.text
    const version = (await read($, replies))[text]
    if (!settings.enabled) return next(e)
    const t = $.ui.resolve(e)
    if (version === undefined) return replyBlock(t, [await next(e)], { label: '訳', press: () => void translateReply($, text) })
    if (version === null) return replyBlock(t, [await next(e)], undefined, '訳しています…')
    // 段落ごとに Claude Code の描き方で描き、その下に訳。学ぶ言語への訳で単語の絵がオンなら、訳の語を押すとその語の絵が出る
    const { paragraphs, isIntoTarget, error } = ReplyTranslations.shown(text, version)
    const isTerminal = e.surface === 'terminal'
    const shownCards = await read($, cards)
    const rows = await Promise.all(paragraphs.map(async (p, i) => {
      const row = await next({ ...e, props: { ...e.props, text: p.text, isFirstOfReply: e.props.isFirstOfReply && i === 0 } })
      if (!p.translation) return row
      const restated = p.translation
      const key = `${text}#${i}`
      const shown = shownCards[key] ?? []
      if (!isIntoTarget || !settings.card) return withTranslation(t, row, { restated, tips: [] })
      const words = wordLine(t, isTerminal, WordCards.words(restated), WordCards.up(shown), word => void pressWord($, key, word, restated), `word-${i}`)
      return withTranslation(t, row, { restated, tips: [] }, words, cardsOf($, t, isTerminal, key, restated, shown))
    }))
    return replyBlock(t, rows, { label: '訳を閉じる', press: () => void showReply($, text) }, error && `訳せませんでした：${error}`)
  })
}
