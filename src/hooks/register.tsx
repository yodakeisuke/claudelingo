import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { ForeignVersions } from '../logic/foreign-version/foreign-version'
import { LanguageSettings } from '../logic/language-settings/language-settings'
import { SETTINGS_PANE, settingsPane, withForeignVersion } from './ui'

// 指示の文面 → その外国語版
const versions = atom({ plugin: 'claudelingo', key: 'versions' } as const, {})
// 設定の保存が拒否されたときの理由
const denied = atom({ plugin: 'claudelingo', key: 'denied' } as const, '')

// 手順書「指示を外国語で示す」：言い直しを頼み、外国語版を残す
async function showForeignVersion($: EngineInterface, text: string, request: ReturnType<typeof ForeignVersions.request>) {
  if (!ForeignVersions.isNeeded(await $.session.surfaces(), (await read($, versions))[text])) return
  const version = await $.model.complete(request).then(ForeignVersions.of, ForeignVersions.failed)
  await update($, versions, all => ({ ...all, [text]: version }))
}

// 手順書「言語設定を変える」：設定に書く。拒否されたら理由を残す
async function changeSetting($: EngineInterface, field: string, value: string | boolean) {
  const r = await $.config.set({ key: `claudelingo.${field}`, value })
  await update($, denied, () => r.deny ?? '')
}

export const register: Register = (on, options) => {
  const settings = LanguageSettings.of(options)

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'lingo', description: 'claudelingo の設定を開く', immediate: true })
    return next(e)
  })

  on('command.run', { command: 'lingo' }, async $ => {
    await $.ui.open({ id: SETTINGS_PANE, title: 'claudelingo', focus: true, closeOnEscape: true, holdToasts: true, rows: 7 })
    return {}
  })

  on('prompt.submit', ($, e, next) => {
    const text = e.text.trim()
    // 送信は待たせない。訳は自分の dispatch で走らせる
    if (ForeignVersions.isWanted(settings, e.origin.kind, text)) {
      $.clock.after(0, () => void showForeignVersion($, text, ForeignVersions.request(settings, text)))
    }
    return next(e)
  })

  // 値が変わると module が新しい options で読み直され、パネルも描き直る
  on('ui.render', { component: 'Pane', requestId: SETTINGS_PANE }, async ($, e) => {
    // スマホには入力欄がないので描けず、engine が自前で描く
    return settingsPane($.ui.resolve(e) as Parameters<typeof settingsPane>[0], settings, await read($, denied), (field, value) => void changeSetting($, field, value))
  })

  // 設定は /lingo だけに出し、Claude 本体の /config には並べない
  on('config.describe', ($, e, next) => next(e.key.startsWith('claudelingo.') ? { ...e, isHidden: true } : e))
  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    const row = await next(e)
    const text = e.props.text.trim()
    const line = ForeignVersions.isOwn(e.props.origin.kind) ? ForeignVersions.line(text, (await read($, versions))[text]) : undefined
    return line ? withForeignVersion($.ui.resolve(e), row, line) : row
  })
}
