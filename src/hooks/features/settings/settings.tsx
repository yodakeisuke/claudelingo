import { atom, read, update } from 'claude-code'
import type { EngineInterface, Hook, MatchedHook } from 'claude-code'

import { Grass } from '../../../logic/grass/grass'
import { LingoSettings } from '../../../logic/lingo-settings/lingo-settings'
import { Result } from '../../../logic/result/result'
import { grassGraph } from '../../ui/grass/grass'
import { SETTINGS_PANE, settingsPane } from '../../ui/settings-pane/settings-pane'

// 設定の保存に失敗したときの理由
const denied = atom({ plugin: 'claudelingo', key: 'denied' } as const, '')
// 今しがた保存できた設定（パネルがその横に ✓ を出す）。無ければ空
const saved = atom({ plugin: 'claudelingo', key: 'saved' } as const, '')
// 保存した回数。✓ を消すのは最後の保存から 1.2 秒後（続けて押しても早く消えない）
let saves = 0

// 設定は mod 自身の保存領域（$.store）に置く。engine の設定行（userConfig）は Desktop のセッションには無く、$.config.set で書けない
const settingsOf = async ($: EngineInterface) => LingoSettings.of(await $.store.get('settings'))

// 手順書「言語設定を変える」：保存して、失敗の理由（成功なら空）を残す。保存できたら、その設定を 1.2 秒だけ残す。パネルはそれを読んで描き直る
const changeSetting = async ($: EngineInterface, field: string, value: string | boolean) => {
  const reason = (await Result.given($.store.set('settings', { ...(await settingsOf($)), [field]: value }))).either(() => '', error => error)
  await update($, denied, () => reason)
  if (!reason) {
    const mine = ++saves
    await update($, saved, () => field)
    $.clock.after(1200, () => void (mine === saves && unmark($)))
  }
  // 帯は設定を $.store から読むので、変えたら描き直させる（オフにした帯をすぐ消す）
  $.ui.invalidate('ui.render')
}

const unmark = async ($: EngineInterface) => {
  await update($, saved, () => '')
  $.ui.invalidate('ui.render')
}

// /lingo の説明は、セッションの始めの母語の文言で（変えたら次のセッションから）
export const started: Hook<'session.start'> = async ($, e, next) => {
  await $.command.register({ name: 'lingo', description: LingoSettings.wording((await settingsOf($)).native).openSettings, immediate: true })
  return next(e)
}

export const lingoRun: MatchedHook<'command.run', { command: 'lingo' }> = async $ => {
  await $.ui.open({ id: SETTINGS_PANE, title: 'claudelingo', focus: true, closeOnEscape: true, holdToasts: true, rows: 20, columns: 100 })
  return {}
}

export const settingsPaneDrawn: MatchedHook<'ui.render', { component: 'Pane'; requestId: typeof SETTINGS_PANE }> = async ($, e) => {
  const settings = await settingsOf($)
  const w = LingoSettings.wording(settings.native)
  // スマホには入力欄がないので、開く場所を案内する
  if (e.surface === 'mobile') {
    const { Text } = $.ui.resolve(e)
    return <Text dimColor>{w.openElsewhere}</Text>
  }
  const t = $.ui.resolve(e)
  const isTerminal = e.surface === 'terminal'
  // 設定の下に、書いた語の草
  const grass = grassGraph(t, w, isTerminal, Grass.of(await $.store.get('words'), Grass.day(await $.clock.now())), e.props.bodyColumns)
  return settingsPane(t, w, isTerminal, settings, await read($, denied), await read($, saved), (field, value) => void changeSetting($, field, value), grass)
}
