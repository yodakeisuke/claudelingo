import { atom, read, update } from 'claude-code'
import type { EngineInterface, On } from 'claude-code'

import { Grass } from '../../../logic/grass/grass'
import { Result } from '../../../logic/result/result'
import { TranslationSettings } from '../../../logic/translation-settings/translation-settings'
import { grassGraph } from '../../ui/grass/grass'
import { SETTINGS_PANE, settingsPane } from '../../ui/settings-pane/settings-pane'

// 設定の保存に失敗したときの理由
const denied = atom({ plugin: 'claudelingo', key: 'denied' } as const, '')

// 設定は mod 自身の保存領域（$.store）に置く。engine の設定行（userConfig）は Desktop のセッションには無く、$.config.set で書けない
const settingsOf = async ($: EngineInterface) => TranslationSettings.of(await $.store.get('settings'))

// 手順書「言語設定を変える」：保存して、失敗の理由（成功なら空）を残す。パネルはそれを読んで描き直る
const changeSetting = async ($: EngineInterface, field: string, value: string | boolean) => {
  const reason = (await Result.given($.store.set('settings', { ...(await settingsOf($)), [field]: value }))).either(() => '', error => error)
  await update($, denied, () => reason)
  // 帯は設定を $.store から読むので、変えたら描き直させる（オフにした帯をすぐ消す）
  $.ui.invalidate('ui.render')
}

export const settings = (on: On) => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'lingo', description: 'claudelingo の設定を開く', immediate: true })
    return next(e)
  })

  on('command.run', { command: 'lingo' }, async $ => {
    await $.ui.open({ id: SETTINGS_PANE, title: 'claudelingo', focus: true, closeOnEscape: true, holdToasts: true, rows: 20, columns: 100 })
    return {}
  })

  on('ui.render', { component: 'Pane', requestId: SETTINGS_PANE }, async ($, e) => {
    // スマホには入力欄がないので、開く場所を案内する
    if (e.surface === 'mobile') {
      const { Text } = $.ui.resolve(e)
      return <Text dimColor>設定は Desktop か CLI で開いてください</Text>
    }
    const t = $.ui.resolve(e)
    const isTerminal = e.surface === 'terminal'
    // 設定の下に、書いた語の草
    const grass = grassGraph(t, isTerminal, Grass.of(await $.store.get('words'), Grass.day(await $.clock.now())), e.props.bodyColumns)
    return settingsPane(t, isTerminal, await settingsOf($), await read($, denied), (field, value) => void changeSetting($, field, value), grass)
  })
}
