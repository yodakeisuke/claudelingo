import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import { DraftSuggestions } from '../logic/draft-suggestion/draft-suggestion'
import { PromptTranslations } from '../logic/prompt-translation/prompt-translation'
import { TranslationSettings } from '../logic/translation-settings/translation-settings'
import { SETTINGS_PANE, draftBand, settingsPane, withTranslation } from './ui'

// 指示の鍵（PromptTranslations.key）→ その外国語版。送信のときに作り、行を描くときに引く
const translations = atom({ plugin: 'claudelingo', key: 'translations' } as const, {})
// 設定の保存に失敗したときの理由
const denied = atom({ plugin: 'claudelingo', key: 'denied' } as const, '')
// 打ちかけと、その外国語版と続き。まだ無いときは null
const suggestion = atom({ plugin: 'claudelingo', key: 'suggestion' } as const, null)
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

// 手順書「打ちかけに外国語版と続きを示す」：打つ手が止まったら 1 回だけ頼み、その間に打たれたら捨てる
const showSuggestion = async ($: EngineInterface, draft: string, signal: AbortSignal) => {
  const request = DraftSuggestions.request(await settingsOf($), draft, (await $.command.list()).map(c => c.name))
  const version = request && (await $.model.complete(request, { signal }).then(PromptTranslations.of, PromptTranslations.of))
  const shown = version ? { draft, version } : null
  if (signal.aborted) return
  await update($, suggestion, () => shown)
  $.ui.invalidate('ui.render')
}

const cancelSuggestion = () => {
  pause?.cancel()
  stop.abort()
}

const suggestAfterPause = ($: EngineInterface, draft: string) => {
  cancelSuggestion()
  const own = new AbortController()
  stop = own
  pause = $.clock.after(500, () => void showSuggestion($, draft, own.signal))
}

// 送ったら、入力欄が空になるのに合わせて帯もすぐ消す
const hideSuggestion = async ($: EngineInterface) => {
  cancelSuggestion()
  await update($, suggestion, () => null)
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
    await $.ui.open({ id: SETTINGS_PANE, title: 'claudelingo', focus: true, closeOnEscape: true, holdToasts: true, rows: 12 })
    return {}
  })

  on('prompt.submit', ($, e, next) => {
    // 送信は待たせない。訳は自分の dispatch で走らせる
    $.clock.after(0, () => void showTranslation($, e.origin.kind, e.text.trim()))
    // 自分で送ったら下書きは空になる。通知などの送信では、打ちかけの帯を残す
    if (PromptTranslations.isOwn(e.origin.kind)) $.clock.after(0, () => void hideSuggestion($))
    return next(e)
  })

  on('prompt.edit', async ($, e, next) => {
    const box = await next(e)
    if (box.text !== e.text) suggestAfterPause($, box.text)
    return box
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const shown = await read($, suggestion)
    if (!shown || e.props.hasSurvey || !(await settingsOf($)).enabled) return next(e)
    const band = DraftSuggestions.band(shown.version)
    // 続きを足すのは、候補を作った打ちかけのままのときだけ（待ちの間に打たれていたら、古い続きになる）
    const addNext = async () => {
      if ((await $.prompt.read()).text.trim() !== shown.draft.trim()) return
      const { isFilled } = await $.prompt.fill({ text: ` ${band.next}`, mode: 'append' })
      if (isFilled) suggestAfterPause($, (await $.prompt.read()).text)
    }
    return draftBand($.ui.resolve(e), band, () => void addNext())
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
