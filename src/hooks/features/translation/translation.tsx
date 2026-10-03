import { atom, read, update } from 'claude-code'
import type { EngineInterface, On, Timer } from 'claude-code'

import type { Aspect, Opened, Practice, Shown, Translation } from '../../../engine-protocol'
import { DraftTranslations } from '../../../logic/draft-translation/draft-translation'
import { PromptTranslations } from '../../../logic/prompt-translation/prompt-translation'
import { Pronunciations } from '../../../logic/pronunciation/pronunciation'
import { ElementKeys } from '../../../logic/element-key/element-key'
import { ReplyTranslations } from '../../../logic/reply-translation/reply-translation'
import { Result } from '../../../logic/result/result'
import { CoachRequest } from '../../../logic/speaking-coach/coach-request'
import { TranslationSettings } from '../../../logic/translation-settings/translation-settings'
import { WordAspects } from '../../../logic/word-aspect/word-aspect'
import { WordCards } from '../../../logic/word-card/word-card'
import { draftBand } from '../../ui/draft-band/draft-band'
import { practiceBand } from '../../ui/practice-band/practice-band'
import type { Coached } from '../../ui/practice-band/practice-band'
import { symbolLine } from '../../ui/read-aloud/read-aloud'
import type { Voice } from '../../ui/read-aloud/read-aloud'
import { REPLY_PANE, paragraphTranslation, replyBlock, replyPane } from '../../ui/reply-translation/reply-translation'
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
const cardsOf = ($: EngineInterface, t: Parameters<typeof wordCard>[0], isTerminal: boolean, row: string, restated: string, shown: Shown[], voice: Voice, prefix?: string) =>
  shown.map(s => wordCard(t, isTerminal, s, isWide => void showCards($, row, list => list.map(o => (o.word === s.word ? { ...o, isWide } : o))), aspect => void pressAspect($, row, s.word, restated, aspect), voice, prefix))

// 読み上げた文の並び（Pronunciations.key）→ 文ごとの発音記号。書いている間は null
const sounds = atom({ plugin: 'claudelingo', key: 'sounds' } as const, {})

// 手順書「読み上げる」：押したらすぐ設定の声で読ませる。段落は 1 つずつ渡せば順に読まれる。読み終わりは待たず、読めなくても何も出さない
const say = async ($: EngineInterface, lines: string[]) => {
  const { voice } = await settingsOf($)
  // 声の欄が空なら渡さず、既定の声で読む
  Pronunciations.spoken(lines).forEach(line => void Result.given($.audio.speak(line, { voice: voice.trim() || undefined })))
}

// 文は読ませながら、発音記号も頼む。書いた記号は残してすぐ出し、書けなかったら次に押したときに頼み直す
const sayWithSymbols = async ($: EngineInterface, lines: string[]) => {
  void say($, lines)
  const key = Pronunciations.key(lines)
  if (key in (await read($, sounds))) return
  await showSymbols($, key, null)
  await showSymbols($, key, Pronunciations.of(await PromptTranslations.of($.model.complete(Pronunciations.request(await settingsOf($), lines)))))
}

const showSymbols = async ($: EngineInterface, key: string, symbols?: string[] | null) => {
  await update($, sounds, all => (symbols === undefined ? Object.fromEntries(Object.entries(all).filter(([k]) => k !== key)) : { ...all, [key]: symbols }))
  $.ui.invalidate('ui.render')
}

// 描くときに渡す読み上げの手。一文の記号は、その文だけの並びの 1 つ目
const voiceOf = async ($: EngineInterface): Promise<Voice> => {
  const shown = await read($, sounds)
  return { say: text => void say($, [text]), sayWithSymbols: text => void sayWithSymbols($, [text]), symbols: text => first(shown[Pronunciations.key([text])]), practise: (sample, pron) => void practise($, sample, pron) }
}
const first = (symbols?: string[] | null) => symbols && symbols[0]

// 返事の文面 → その訳。訳している間は null
const replies = atom({ plugin: 'claudelingo', key: 'replies' } as const, {})

// 返事の訳を頼み、届いたら描き直させる
const translateReply = async ($: EngineInterface, text: string, request: NonNullable<ReturnType<typeof ReplyTranslations.request>>) => {
  await showReply($, text, null)
  await showReply($, text, await PromptTranslations.of($.model.complete(request)))
}

const showReply = async ($: EngineInterface, text: string, version: Translation | null) => {
  await update($, replies, all => ({ ...all, [text]: version }))
  $.ui.invalidate('ui.render')
}

// 横のパネルに出している返事の文面
const paneReply = atom({ plugin: 'claudelingo', key: 'paneReply' } as const, '')

// 手順書「返事の訳を横に出す」：押した返事をパネルに出す。まだ頼んでいないか、訳せなかったなら頼む
const openReply = async ($: EngineInterface, text: string, request: NonNullable<ReturnType<typeof ReplyTranslations.request>>) => {
  await update($, paneReply, () => text)
  await $.ui.open({ id: REPLY_PANE, title: '訳' })
  const version = (await read($, replies))[text]
  if (version === undefined || (version !== null && Result.given(version).either(() => false, () => true))) await translateReply($, text, request)
}

// 開いている話す練習。開いていなければ null
const practice = atom({ plugin: 'claudelingo', key: 'practice' } as const, null)

// 手順書「話す練習を開く」：押した文の練習を入力欄の上に開く。同じ文の練習が開いていれば閉じる
const practise = async ($: EngineInterface, text: string, pron?: string) => {
  const sample = Pronunciations.spoken([text]).join('')
  await showPractice($, now => (now?.sample === sample ? null : { sample, pron }))
}

// 手順書「声を聞いてコーチする」：入れた文をお手本と比べさせ、届いたら帯に出す。その間に練習が変わっていたら捨てる
const hear = async ($: EngineInterface, heard: string) => {
  const asked = await read($, practice)
  if (!asked || !heard.trim()) return
  await showPractice($, () => ({ ...asked, heard, coach: null }))
  const coach = await PromptTranslations.of($.model.complete(CoachRequest.of(await settingsOf($), { sample: asked.sample, heard })))
  await showPractice($, now => (now?.sample === asked.sample && now.heard === heard ? { ...now, coach } : now))
}

const showPractice = async ($: EngineInterface, change: (now: Practice | null) => Practice | null) => {
  await update($, practice, change)
  $.ui.invalidate('ui.render')
}

// 帯に出すコーチの返事。頼んでいなければ何も、頼んでいる間は一言、失敗したらその理由
const coachedOf = (coach?: Translation | null) =>
  coach === undefined ? undefined : coach === null ? '聞いています…' : Result.given(coach).either<Coached>(() => PromptTranslations.line(coach), error => `コーチできませんでした：${error}`)

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

// 打ちかけの校正の帯。校正がなければ undefined
const draftBandOf = async ($: EngineInterface, t: Parameters<typeof draftBand>[0]) => {
  const shown = await read($, draft)
  const settings = await settingsOf($)
  const line = shown && DraftTranslations.line(shown.version)
  if (!shown || !line || !settings.enabled || !settings.live) return undefined
  const replacement = DraftTranslations.replacement(shown.text, shown.version)
  // 置き換えるのは、校正した打ちかけのままのときだけ（待ちの間に打たれていたら、古い言い直しになる）
  const replace = async (text: string) => {
    if ((await $.prompt.read()).text.trim() !== shown.text.trim()) return
    const { isFilled } = await $.prompt.fill({ text, mode: 'replace' })
    if (isFilled) void translateAfterPause($, text)
  }
  return draftBand(t, line, replacement ? () => void replace(replacement) : undefined)
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

  // 入力欄の上は、開いている話す練習と打ちかけの校正を上下に
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    // 入力欄の上の帯は端末と Desktop にしかない
    const t = $.ui.resolve(e) as Parameters<typeof practiceBand>[0]
    const band = await draftBandOf($, t)
    const opened = await read($, practice)
    if (!opened) return band ?? next(e)
    // 欄の文は打つたびに残す（描き直しで消えないように）。描き直しはしない
    const hands = { keep: (text: string) => void update($, practice, now => now && { ...now, heard: text }), hear: (heard: string) => void hear($, heard), say: () => void say($, [opened.sample]), again: () => void showPractice($, now => now && { sample: now.sample, pron: now.pron, heard: '' }) }
    const { Box } = t
    return <Box flexDirection="column" gap={1}>{practiceBand(t, e.surface === 'terminal', opened, coachedOf(opened.coach), hands)}{band}</Box>
  })

  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    const row = await next(e)
    const key = PromptTranslations.key(e.props.text)
    const version = (await read($, translations))[key]
    const line = PromptTranslations.line(version)
    if (!line) return row
    const t = $.ui.resolve(e)
    const voice = await voiceOf($)
    const isTranslated = Result.given(version).either(() => true, () => false)
    const isTerminal = e.surface === 'terminal'
    const id = ElementKeys.of('line', e.props.text)
    if (!isTranslated || !(await settingsOf($)).card) return withTranslation(t, isTerminal, id, row, line, isTranslated ? voice : undefined)
    // 単語の絵がオンなら、訳の行の語を押すとその語の絵が下に出る
    const shown = (await read($, cards))[key] ?? []
    const words = wordLine(t, isTerminal, WordCards.words(line.restated), WordCards.up(shown), word => void pressWord($, key, word, line.restated), `${id}-word`)
    return withTranslation(t, isTerminal, id, row, line, voice, words, cardsOf($, t, isTerminal, key, line.restated, shown, voice, `${id}-`))
  })

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    const settings = await settingsOf($)
    const text = e.props.text
    const request = ReplyTranslations.request(settings, text)
    if (!settings.enabled || !request) return next(e)
    // 端末の返事の頭の行は「● 」の 2 マス下げで描かれる。🌐 もそこにそろえる
    const indent = e.surface === 'terminal' && e.props.isFirstOfReply ? 2 : 0
    return replyBlock($.ui.resolve(e), ElementKeys.of('reply', text), await next(e), indent, () => void openReply($, text, request))
  })

  // パネルに出している返事の訳を段落ごとに描く。学ぶ言語への訳で単語の絵がオンなら、訳の語を押すとその語の絵が出る（訳は行ごと）
  // 読み上げは学ぶ言語の側（学ぶ言語への訳か、学ぶ言語で書かれた本文）を段落ごとに読み、その段落の訳の下に発音記号
  on('ui.render', { component: 'Pane', requestId: REPLY_PANE }, async ($, e) => {
    const t = $.ui.resolve(e)
    const isTerminal = e.surface === 'terminal'
    const text = await read($, paneReply)
    const id = ElementKeys.of('reply', text)
    const head = ReplyTranslations.head(text)
    const version = (await read($, replies))[text]
    if (!version) return replyPane(t, id, head, [], '訳しています…')
    const settings = await settingsOf($)
    return Result.given(version).either(async value => {
      const { paragraphs, isIntoTarget } = ReplyTranslations.shown(text, value)
      const shownCards = await read($, cards)
      const voice = await voiceOf($)
      const spoken = paragraphs.flatMap(p => (p.translation ? [isIntoTarget ? p.translation : p.text] : []))
      const said = (await read($, sounds))[Pronunciations.key(spoken)]
      const translations = paragraphs.flatMap((p, i) => {
        const restated = p.translation
        if (!restated) return []
        const symbol = symbolLine(t, said && said[paragraphs.slice(0, i).filter(q => q.translation).length])
        const key = `${text}#${i}`
        const shown = shownCards[key] ?? []
        if (!isIntoTarget || !settings.card) return [paragraphTranslation(t, restated, symbol)]
        const lines = restated.split('\n').map((line, j) => wordLine(t, isTerminal, WordCards.words(line), WordCards.up(shown), word => void pressWord($, key, word, restated), `${id}-word-${i}-${j}`))
        return [paragraphTranslation(t, restated, symbol, lines, cardsOf($, t, isTerminal, key, restated, shown, voice, `${id}-word-${i}-`))]
      })
      return replyPane(t, id, head, translations, undefined, spoken.length > 0 ? () => void sayWithSymbols($, spoken) : undefined)
    }, async error => replyPane(t, id, head, [], `訳せませんでした：${error}`))
  })
}
