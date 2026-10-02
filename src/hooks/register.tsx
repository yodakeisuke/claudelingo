import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { ForeignVersions } from '../logic/foreign-version/foreign-version'
import { LanguageSettings } from '../logic/language-settings/language-settings'
import { SETTINGS_PANE, settingsPane, withForeignVersion } from './ui'

// 指示の文面 → その外国語版
const versions = atom({ plugin: 'claudelingo', key: 'versions' } as const, {})
// 設定の保存に失敗したときの理由
const denied = atom({ plugin: 'claudelingo', key: 'denied' } as const, '')
// 設定を保存した回数。パネルはこれを読んで描き直る（値そのものは $.store にある）
const saves = atom({ plugin: 'claudelingo', key: 'saves' } as const, 0)

// 設定は mod 自身の保存領域（$.store）に置く。engine の設定行（userConfig）は Desktop のセッションには無く、$.config.set で書けない
const settingsOf = async ($: EngineInterface) => LanguageSettings.of(await $.store.get('settings'))

// 手順書「指示を外国語で示す」：訳す指示なら言い直しを頼み、外国語版を残す
const showForeignVersion = async ($: EngineInterface, from: string, text: string) => {
  const request = ForeignVersions.request(await settingsOf($), from, text)
  if (!request || !ForeignVersions.isNeeded(await $.session.surfaces(), (await read($, versions))[text])) return
  const version = await $.model.complete(request).then(ForeignVersions.of, ForeignVersions.of)
  await update($, versions, all => ({ ...all, [text]: version }))
}

// 手順書「言語設定を変える」：保存して、パネルを描き直す。失敗したら理由を残す
// 打っている途中の保存では描き直さない（打ちかけの文字を、描き直しが巻き戻さないように）
const changeSetting = async ($: EngineInterface, field: string, value: string | boolean, isTyping = false) => {
  const reason = await $.store.set('settings', { ...(await settingsOf($)), [field]: value }).then(() => '', (error: unknown) => (error instanceof Error ? error.message : String(error)))
  if (reason !== (await read($, denied))) await update($, denied, () => reason)
  // 設定が変われば、前の設定で作った訳は捨てる（言語を変えたのに古い言語の訳が出ないように）
  await update($, versions, () => ({}))
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
    $.clock.after(0, () => void showForeignVersion($, e.origin.kind, e.text.trim()))
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
    const line = ForeignVersions.line(e.props.origin.kind, text, (await read($, versions))[text])
    return line ? withForeignVersion($.ui.resolve(e), e.surface === 'terminal', row, line) : row
  })
}
