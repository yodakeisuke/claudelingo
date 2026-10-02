import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { Translation } from '../types'
import { DraftTranslations } from '../logic/draft-translation/draft-translation'
import { PromptTranslations } from '../logic/prompt-translation/prompt-translation'
import { TranslationSettings } from '../logic/translation-settings/translation-settings'
import { SETTINGS_PANE, draftBand, settingsPane, withTranslation } from './ui'

// 指示の鍵（PromptTranslations.key）→ その外国語版。送信のときに作り、行を描くときに引く
const translations = atom({ plugin: 'claudelingo', key: 'translations' } as const, {})
// 設定の保存に失敗したときの理由
const denied = atom({ plugin: 'claudelingo', key: 'denied' } as const, '')
// 打ちかけと、その校正。まだ無いときは null
const draft = atom({ plugin: 'claudelingo', key: 'draft' } as const, null)
// 打つ手が止まるのを待つタイマーと、走っている依頼の止め手。次の打鍵で両方やめる
let pause: Timer | undefined
let stop = new AbortController()

// 設定は mod 自身の保存領域（$.store）に置く。engine の設定行（userConfig）は Desktop のセッションには無く、$.config.set で書けない
const settingsOf = async ($: EngineInterface) => TranslationSettings.of(await $.store.get('settings'))

// 手順書「指示を外国語で示す」：訳す指示なら言い直しを頼み、行が引けるように残す
const showTranslation = async ($: EngineInterface, from: string, text: string) => {
  const request = PromptTranslations.request(await settingsOf($), { from, text }, (await $.command.list()).map(c => c.name))
  if (!request || !PromptTranslations.isNeeded(await $.session.surfaces())) return
  const translation = await $.model.complete(request).then(PromptTranslations.of, PromptTranslations.of)
  await update($, translations, all => ({ ...all, [PromptTranslations.key(text)]: translation }))
  // 訳が届いたらすぐ描き直させる（状態の変化だけでは、面によっては次の描画まで行が出ない）
  $.ui.invalidate('ui.render')
}

// 手順書「打ちかけを外国語で示す」：打つ手が止まったら 1 回だけ頼み、その間に打たれたら捨てる
const showDraftTranslation = async ($: EngineInterface, text: string, signal: AbortSignal) => {
  const request = DraftTranslations.request(await settingsOf($), text, (await $.command.list()).map(c => c.name))
  const version = request && (await $.model.complete(request, { signal }).then(PromptTranslations.of, PromptTranslations.of))
  const shown = version ? { text, version } : null
  if (signal.aborted) return
  await update($, draft, () => shown)
  $.ui.invalidate('ui.render')
  if (shown) await underlineNow($, shown)
}

// 赤線は打鍵の応答か fill でしか付かない。校正が届いたら、同じ文面を fill し直して赤線だけ付ける
// 文字もカーソルも変わらないよう、入力欄が校正した下書きのままで、カーソルが末尾のときだけ
const underlineNow = async ($: EngineInterface, shown: { text: string; version: Translation }) => {
  const box = await $.prompt.read()
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

// 手順書「言語設定を変える」：保存して、失敗の理由（成功なら空）を残す。パネルはそれを読んで描き直る
const changeSetting = async ($: EngineInterface, field: string, value: string | boolean) => {
  const reason = await $.store.set('settings', { ...(await settingsOf($)), [field]: value }).then(() => '', (error: unknown) => (error instanceof Error ? error.message : String(error)))
  await update($, denied, () => reason)
  // 帯は設定を $.store から読むので、変えたら描き直させる（オフにした帯をすぐ消す）
  $.ui.invalidate('ui.render')
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'lingo', description: 'claudelingo の設定を開く', immediate: true })
    return next(e)
  })

  on('command.run', { command: 'lingo' }, async $ => {
    await $.ui.open({ id: SETTINGS_PANE, title: 'claudelingo', focus: true, closeOnEscape: true, holdToasts: true, rows: 16 })
    return {}
  })

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

  on('ui.render', { component: 'Pane', requestId: SETTINGS_PANE }, async ($, e) => {
    // スマホには入力欄がないので描けず、engine が自前で描く
    return settingsPane($.ui.resolve(e) as Parameters<typeof settingsPane>[0], e.surface === 'terminal', await settingsOf($), await read($, denied), (field, value) => void changeSetting($, field, value))
  })

  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    const row = await next(e)
    const line = PromptTranslations.line((await read($, translations))[PromptTranslations.key(e.props.text)])
    return line ? withTranslation($.ui.resolve(e), row, line) : row
  })
}
