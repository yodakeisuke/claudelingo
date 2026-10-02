import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { ForeignVersions } from '../logic/foreign-version/foreign-version'
import { LanguageSettings } from '../logic/language-settings/language-settings'
import type { ForeignVersion } from '../types'
import { SETTINGS_PANE, settingsPane, withForeignVersion } from './ui'

// 指示の文面 → その外国語版
const versions = atom({ plugin: 'claudelingo', key: 'versions' } as const, {})
// 設定の保存が拒否されたときの理由
const denied = atom({ plugin: 'claudelingo', key: 'denied' } as const, '')

// 手順書「指示を外国語で示す」：言い直しを頼み、外国語版を残す。エラーはデバッグログに1行
async function showForeignVersion($: EngineInterface, request: ReturnType<typeof ForeignVersions.request>) {
  let version: ForeignVersion
  try {
    version = ForeignVersions.of(await $.model.complete(request))
  } catch (error) {
    version = ForeignVersions.failed(error)
  }
  await update($, versions, all => ({ ...all, [request.prompt]: version }))
  if (!version.ok) $.ui.log(`translation failed: ${JSON.stringify(version.error)}`, { to: 'debug' })
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
      $.clock.after(0, () => void showForeignVersion($, ForeignVersions.request(settings, text)))
    }
    return next(e)
  })

  // 値が変わると module が新しい options で読み直され、パネルも描き直る
  on('ui.render', { component: 'Pane', requestId: SETTINGS_PANE }, async ($, e) => {
    if (e.surface === 'mobile') {
      const { Text } = $.ui.resolve(e)
      return <Text dimColor>設定は Desktop か CLI で開いてください</Text>
    }
    return settingsPane($.ui.resolve(e), settings, await read($, denied), (field, value) => void changeSetting($, field, value))
  })

  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    const row = await next(e)
    const version = e.props.origin.kind === 'composer' ? (await read($, versions))[e.props.text.trim()] : undefined
    return version?.ok ? withForeignVersion($.ui.resolve(e), row, version.value) : row
  })
}
