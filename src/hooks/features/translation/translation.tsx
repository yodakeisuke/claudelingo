import { atom, read, update } from 'claude-code'
import type { EngineInterface, On, Timer } from 'claude-code'

import type { Aspect, Practice, Shown, Translation } from '../../../engine-protocol'
import { Completions } from '../../../logic/completion/completion'
import { DraftTranslations } from '../../../logic/draft-translation/draft-translation'
import { ElementKeys } from '../../../logic/element-key/element-key'
import { OpenCards } from '../../../logic/open-cards/open-cards'
import { PromptTranslations } from '../../../logic/prompt-translation/prompt-translation'
import { Pronunciations } from '../../../logic/pronunciation/pronunciation'
import { ReplyTranslations } from '../../../logic/reply-translation/reply-translation'
import { Result } from '../../../logic/result/result'
import { CoachRequest } from '../../../logic/speaking-practice/coach-request'
import { SpeakingPractice } from '../../../logic/speaking-practice/speaking-practice'
import { TranslationSettings } from '../../../logic/translation-settings/translation-settings'
import { WordAspects } from '../../../logic/word-aspect/word-aspect'
import { WordCards } from '../../../logic/word-card/word-card'
import { WordLines } from '../../../logic/word-line/word-line'
import { draftBand } from '../../ui/draft-band/draft-band'
import { practiceBand } from '../../ui/practice-band/practice-band'
import { symbolLine } from '../../ui/read-aloud/read-aloud'
import type { Voice } from '../../ui/read-aloud/read-aloud'
import { REPLY_PANE, paragraphTranslation, replyBlock, replyPane } from '../../ui/reply-translation/reply-translation'
import { withTranslation } from '../../ui/translation-line/translation-line'
import { wordCard, wordLine } from '../../ui/word-card/word-card'

// 設定パネル（settings.tsx）が $.store に置いた設定。$ は import をまたいで渡せないので、ここでも読む
const settingsOf = async ($: EngineInterface) => TranslationSettings.of(await $.store.get('settings'))

// 指示の鍵（PromptTranslations.key）→ その外国語版。送信のときに作り、行を描くときに引く
const translations = atom({ plugin: 'claudelingo', key: 'translations' } as const, {})
// 指示の鍵か返事の段落 → その下に開いている単語の絵
const cards = atom({ plugin: 'claudelingo', key: 'cards' } as const, {})
// 描いた絵（WordCards.saving の形）。ディスクには置かず、セッションの間だけ持つ
const drawn = atom({ plugin: 'claudelingo', key: 'drawn' } as const, {})

// 手順書「指示を外国語で示す」：訳す指示なら言い直しを頼み、行が引けるように残す
const showTranslation = async ($: EngineInterface, from: string, text: string) => {
  const request = PromptTranslations.request(await settingsOf($), { from, text }, (await $.command.list()).map(c => c.name))
  if (!request || !PromptTranslations.isNeeded(await $.session.surfaces())) return
  const translation = await Completions.of($.model.complete(request))
  await update($, translations, all => ({ ...all, [PromptTranslations.key(text)]: translation }))
  // 訳が届いたらすぐ描き直させる（状態の変化だけでは、面によっては次の描画まで行が出ない）
  $.ui.invalidate('ui.render')
}

const rowOf = async ($: EngineInterface, row: string) => (await read($, cards))[row] ?? []

// 開いている絵は置き換えで変える（中を書き換えると Desktop が描き直さない）
const showCards = async ($: EngineInterface, row: string, change: (list: Shown[]) => Shown[]) => {
  await update($, cards, all => ({ ...all, [row]: change(all[row] ?? []) }))
  $.ui.invalidate('ui.render')
}

// 手順書「単語の絵を出す」：同じ絵が開いていれば閉じ、なければ下に並べる。描いた絵はセッションの間残し、二度目からはすぐ出す
const pressWord = async ($: EngineInterface, row: string, word: string, restated: string) => {
  const saved = WordCards.saved(await read($, drawn), { word, restated })
  await showCards($, row, list => OpenCards.pressed(list, word, saved))
  if (OpenCards.isDrawing(await rowOf($, row), word)) await drawCard($, row, word, restated)
}

// 押した語の絵を頼む
const drawCard = async ($: EngineInterface, row: string, word: string, restated: string) => {
  const card = WordCards.of(await Completions.of($.model.complete(WordCards.request(await settingsOf($), word, restated))), { word, restated })
  const kept = OpenCards.kept(await rowOf($, row), word, card)
  if (kept) await update($, drawn, all => WordCards.saving(all, kept, { word, restated }))
  await showCards($, row, list => OpenCards.drawn(list, word, card))
}

// 手順書「語を深める」：開いている欄なら閉じ、なければ開いて書かせる。絵とは別に頼むので、描いている間も押せる
const pressAspect = async ($: EngineInterface, row: string, restated: string, at: { word: string; aspect: Aspect }) => {
  await showCards($, row, list => OpenCards.aspectPressed(list, at))
  if (!OpenCards.isWriting(await rowOf($, row), at)) return
  const version = await Completions.of($.model.complete(WordAspects.request(await settingsOf($), at.aspect, { word: at.word, restated })))
  await showCards($, row, list => OpenCards.written(list, at, WordAspects.of(version, at.aspect)))
}

// 描くときに渡す単語の絵の手。row は絵を並べる鍵（指示か返事の段落）、restated は語がある訳の行、id と prefix はボタンの名前の頭
const wordsOf = async ($: EngineInterface, t: Parameters<typeof wordCard>[0], isTerminal: boolean, voice: Voice) => {
  const all = await read($, cards)
  return {
    // 訳の 1 行を押せる語の並びで。押すとその語の絵が下に出る
    line: (row: string, restated: string, line: Parameters<typeof wordLine>[2], id: string) =>
      wordLine(t, isTerminal, line, WordCards.up(all[row] ?? []), word => void pressWord($, row, word, restated), id),
    // 開いている絵。拡大・縮小と欄はその絵だけ
    cards: (row: string, restated: string, prefix: string) =>
      (all[row] ?? []).map(s => wordCard(t, isTerminal, s, isWide => void showCards($, row, list => OpenCards.resized(list, s.word, isWide)), aspect => void pressAspect($, row, restated, { word: s.word, aspect }), voice, prefix)),
  }
}

// 読み上げた文の並び → 文ごとの発音記号（Pronunciations.saving の形）。書いている間は null
const sounds = atom({ plugin: 'claudelingo', key: 'sounds' } as const, {})

// 手順書「読み上げる」：押したらすぐ設定の声で読ませる。段落は 1 つずつ渡せば順に読まれる。読み終わりは待たず、読めなくても何も出さない
const say = async ($: EngineInterface, lines: string[]) => {
  const { voice } = await settingsOf($)
  // 声の欄が空なら渡さず、既定の声で読む
  Pronunciations.spoken(lines).forEach(line => void Result.given($.audio.speak(line, { voice: voice.trim() || undefined })))
}

// 文は読ませながら、発音記号も頼む。書いた記号は残してすぐ出す
const sayWithSymbols = async ($: EngineInterface, lines: string[]) => {
  void say($, lines)
  if (Pronunciations.isAsked(await read($, sounds), lines)) return
  await showSymbols($, lines, null)
  await showSymbols($, lines, Pronunciations.of(await Completions.of($.model.complete(Pronunciations.request(await settingsOf($), lines)))))
}

const showSymbols = async ($: EngineInterface, lines: string[], symbols?: string[] | null) => {
  await update($, sounds, all => Pronunciations.saving(all, lines, symbols))
  $.ui.invalidate('ui.render')
}

// 描くときに渡す読み上げの手
const voiceOf = async ($: EngineInterface): Promise<Voice> => {
  const all = await read($, sounds)
  return { say: text => void say($, [text]), sayWithSymbols: text => void sayWithSymbols($, [text]), symbols: text => Pronunciations.symbol(all, [text], 0), practise: (sample, pron) => void practise($, sample, pron) }
}

// 返事の鍵（ReplyTranslations.key：言語の組み合わせと文面）→ その訳。訳している間は null
const replies = atom({ plugin: 'claudelingo', key: 'replies' } as const, {})
// 横のパネルに出している返事の文面と、その訳の鍵（開いたときの設定のもの）
const paneReply = atom({ plugin: 'claudelingo', key: 'paneReply' } as const, { text: '', key: '' })

// 手順書「返事の訳を横に出す」：押した返事をパネルに出し、頼む時なら訳を頼む
// パネルは最初の await より前に開く（後だと押したことへの応答とみなされず、144 桁未満の端末では置かれない）
const openReply = async ($: EngineInterface, text: string) => {
  const opened = $.ui.open({ id: REPLY_PANE, title: '訳' })
  const settings = await settingsOf($)
  const key = ReplyTranslations.key(settings, text)
  await update($, paneReply, () => ({ text, key }))
  await opened
  const request = ReplyTranslations.request(settings, text)
  if (!request || !ReplyTranslations.isDue((await read($, replies))[key])) return
  await showReply($, key, null)
  await showReply($, key, await Completions.of($.model.complete(request)))
}

const showReply = async ($: EngineInterface, key: string, version: Translation | null) => {
  await update($, replies, all => ({ ...all, [key]: version }))
  $.ui.invalidate('ui.render')
}

// 開いている話す練習。開いていなければ null
const practice = atom({ plugin: 'claudelingo', key: 'practice' } as const, null)

// 手順書「話す練習を開く」：押した文の練習を入力欄の上に開く。同じ文の練習が開いていれば閉じる
const practise = ($: EngineInterface, text: string, pron?: string) => showPractice($, now => SpeakingPractice.pressed(now, text, pron))

// 手順書「声を聞いてコーチする」：入れた文をお手本と比べさせ、届いたら帯に出す。その間に練習が変わっていたら捨てる
const hear = async ($: EngineInterface, heard: string) => {
  const asked = SpeakingPractice.asking(await read($, practice), heard)
  if (!asked) return
  await showPractice($, () => asked)
  const coach = await Completions.of($.model.complete(CoachRequest.of(await settingsOf($), asked)))
  await showPractice($, now => SpeakingPractice.coached(now, asked, coach))
}

const showPractice = async ($: EngineInterface, change: (now: Practice | null) => Practice | null) => {
  await update($, practice, change)
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
  const version = request && (await Completions.of($.model.complete(request, { signal })))
  const shown = version ? { text, version } : null
  if (signal.aborted) return
  await showDraft($, shown)
  if (shown) await underlineNow($, shown, signal)
}

// 赤線は打鍵の応答か fill でしか付かない。校正が届いたら、同じ文面を fill し直して赤線だけ付ける
// 文字もカーソルも変わらないよう、入力欄が校正した下書きのままで、カーソルが末尾のときだけ
const underlineNow = async ($: EngineInterface, shown: { text: string; version: Translation }, signal: AbortSignal) => {
  const box = await $.prompt.read()
  if (signal.aborted) return
  const decorations = DraftTranslations.underlines(box.text, shown)
  if (box.text === shown.text && box.cursor === box.text.length && decorations.length > 0) await $.prompt.fill({ text: box.text, mode: 'replace', decorations })
}

const showDraft = async ($: EngineInterface, shown: { text: string; version: Translation } | null) => {
  await update($, draft, () => shown)
  $.ui.invalidate('ui.render')
}

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
  await showDraft($, null)
}

// 打ちかけの校正の帯。校正がなければ undefined
const draftBandOf = async ($: EngineInterface, t: Parameters<typeof draftBand>[0]) => {
  const shown = await read($, draft)
  const band = DraftTranslations.band(await settingsOf($), shown)
  if (!shown || !band) return undefined
  const { line, replacement } = band
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
    return { ...box, decorations: [...(box.decorations ?? []), ...DraftTranslations.underlines(box.text, await read($, draft))] }
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
    const hands = { keep: (text: string) => void update($, practice, now => SpeakingPractice.kept(now, text)), hear: (heard: string) => void hear($, heard), say: () => void say($, [opened.sample]), again: () => void showPractice($, SpeakingPractice.again) }
    const { Box } = t
    return <Box flexDirection="column" gap={1}>{practiceBand(t, e.surface === 'terminal', opened, SpeakingPractice.shown(opened.coach), hands)}{band}</Box>
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
    const id = ElementKeys.of('line', e.requestId)
    if (!isTranslated || !(await settingsOf($)).card) return withTranslation(t, isTerminal, id, row, line, isTranslated ? voice : undefined)
    // 単語の絵がオンなら、訳の行の語を押すとその語の絵が下に出る
    const words = await wordsOf($, t, isTerminal, voice)
    return withTranslation(t, isTerminal, id, row, line, voice, words.line(key, line.restated, WordLines.of(line.restated), `${id}-word`), words.cards(key, line.restated, `${id}-`))
  })

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    const text = e.props.text
    if (!ReplyTranslations.request(await settingsOf($), text)) return next(e)
    // 端末の返事の頭の行は「● 」の 2 マス下げで描かれる。🌐 もそこにそろえる
    const indent = e.surface === 'terminal' && e.props.isFirstOfReply ? 2 : 0
    return replyBlock($.ui.resolve(e), ElementKeys.of('reply', e.requestId), await next(e), indent, () => void openReply($, text))
  })

  // パネルに出している返事の訳を段落ごとに描く。訳の語から絵を出すなら、訳の語を押すとその語の絵が出る（訳は行ごと）
  // 読み上げは段落ごとに読み、その段落の訳の下に発音記号
  on('ui.render', { component: 'Pane', requestId: REPLY_PANE }, async ($, e) => {
    const t = $.ui.resolve(e)
    const isTerminal = e.surface === 'terminal'
    const { text, key: reply } = await read($, paneReply)
    const id = ElementKeys.of('reply', text)
    const head = ReplyTranslations.head(text)
    const version = (await read($, replies))[reply]
    // /clear で状態が空になっても、パネルは開いたまま残る
    if (!text) return replyPane(t, id, head, [], '返事の 🌐 を押すと、ここに訳が出ます')
    if (!version) return replyPane(t, id, head, [], '訳しています…')
    const settings = await settingsOf($)
    const words = await wordsOf($, t, isTerminal, await voiceOf($))
    const said = await read($, sounds)
    return Result.given(version).either(async value => {
      const { translated, spoken, withCards } = ReplyTranslations.shown(settings, text, value)
      const translations = translated.map(({ restated, at }, n) => {
        const symbol = symbolLine(t, Pronunciations.symbol(said, spoken, n))
        const key = `${reply}#${at}`
        const lines = WordLines.all(restated).map((line, j) => (withCards ? words.line(key, restated, line, `${id}-word-${at}-${j}`) : wordLine(t, isTerminal, line, new Set())))
        return paragraphTranslation(t, symbol, lines, withCards ? words.cards(key, restated, `${id}-word-${at}-`) : [])
      })
      return replyPane(t, id, head, translations, undefined, spoken.length > 0 ? () => void sayWithSymbols($, spoken) : undefined)
    }, async error => replyPane(t, id, head, [], `訳せませんでした：${error}`))
  })
}
