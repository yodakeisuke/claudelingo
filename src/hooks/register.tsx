import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { PromptTranslations } from '../logic/prompt-translation/prompt-translation'
import { TranslationSettings } from '../logic/translation-settings/translation-settings'
import { SETTINGS_PANE, settingsPane, withTranslation } from './ui'

// 指示の文面 → その外国語版
const translations = atom({ plugin: 'claudelingo', key: 'translations' } as const, {})
// 設定の保存に失敗したときの理由
const denied = atom({ plugin: 'claudelingo', key: 'denied' } as const, '')
// 設定を保存した回数。パネルはこれを読んで描き直る（値そのものは $.store にある）
const saves = atom({ plugin: 'claudelingo', key: 'saves' } as const, 0)

// 設定は mod 自身の保存領域（$.store）に置く。engine の設定行（userConfig）は Desktop のセッションには無く、$.config.set で書けない
const settingsOf = async ($: EngineInterface) => TranslationSettings.of(await $.store.get('settings'))

// 手順書「指示を外国語で示す」：訳す指示なら言い直しを頼み、どの言語の組で作ったかと一緒に残す
const showTranslation = async ($: EngineInterface, from: string, text: string) => {
  const settings = await settingsOf($)
  const languages = `${settings.native}>${settings.target}`
  const request = PromptTranslations.request(settings, from, text)
  if (!request || !PromptTranslations.isNeeded(await $.session.surfaces(), languages, (await read($, translations))[text])) return
  const translation = await $.model.complete(request).then(PromptTranslations.of, PromptTranslations.of)
  await update($, translations, all => ({ ...all, [text]: { ...translation, languages } }))
}

// 手順書「言語設定を変える」：保存して、パネルを描き直す。失敗したら理由を残す
// 打っている途中の保存では描き直さない（打ちかけの文字を、描き直しが巻き戻さないように）
const changeSetting = async ($: EngineInterface, field: string, value: string | boolean, isTyping = false) => {
  const reason = await $.store.set('settings', { ...(await settingsOf($)), [field]: value }).then(() => '', (error: unknown) => (error instanceof Error ? error.message : String(error)))
  if (reason !== (await read($, denied))) await update($, denied, () => reason)
  if (!isTyping) await update($, saves, n => n + 1)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'lingo', description: 'claudelingo の設定を開く', immediate: true })
    return next(e)
  })

  on('command.run', { command: 'lingo' }, async $ => {
    // 開くたびに、保存してある値で描き直す（打って保存した値は描き直していないので）
    await update($, saves, n => n + 1)
    await $.ui.open({ id: SETTINGS_PANE, title: 'claudelingo', focus: true, closeOnEscape: true, holdToasts: true, rows: 12 })
    return {}
  })

  on('prompt.submit', ($, e, next) => {
    // 送信は待たせない。訳は自分の dispatch で走らせる
    $.clock.after(0, () => void showTranslation($, e.origin.kind, e.text.trim()))
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: SETTINGS_PANE }, async ($, e) => {
    await read($, saves)
    // スマホには入力欄がないので描けず、engine が自前で描く
    return settingsPane($.ui.resolve(e) as Parameters<typeof settingsPane>[0], e.surface === 'terminal', await settingsOf($), await read($, denied), (field, value, isTyping) => void changeSetting($, field, value, isTyping))
  })

  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    const row = await next(e)
    const text = e.props.text.trim()
    const line = PromptTranslations.line(e.props.origin.kind, text, (await read($, translations))[text])
    return line ? withTranslation($.ui.resolve(e), e.surface === 'terminal', row, line) : row
  })
}
