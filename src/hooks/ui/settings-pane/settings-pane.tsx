import type { Elements, RenderElement } from 'claude-code'

import type { Wording } from '../../../locales/en'
import { LingoSettings } from '../../../logic/lingo-settings/lingo-settings'

type Settings = ReturnType<typeof LingoSettings.of>
type Switch = 'enabled' | 'afterSend' | 'live' | 'card'
type Save = (field: keyof Settings, value: string | boolean) => void

export const SETTINGS_PANE = 'claudelingo'

// /lingo の設定パネル：オン・オフは状態の文字と切り替えボタン。オフのまとまりは見出しだけ、mod ごとオフなら他のまとまりも出さない
// 押す・確定するとその場で保存し、失敗したら理由を赤で1行。端末は行を詰め、それ以外の面は余白と行間を取る
export const settingsPane = (t: Elements[Exclude<keyof Elements, 'mobile'>], w: Wording, isTerminal: boolean, settings: Settings, denied: string, save: Save, grass: RenderElement) => {
  const { Box, Text, Button, Input } = t
  const room = isTerminal ? 0 : 1
  const field = (label: string, control: RenderElement) => (
    <Box alignItems="center" gap={1} paddingLeft={2}>
      <Box width={12} flexShrink={0}><Text dimColor>{label}</Text></Box>
      {control}
    </Box>
  )
  const group = (title: string, key: Switch | null, ...fields: RenderElement[]) => {
    const on = key === null || settings[key]
    return (
      <Box flexDirection="column" gap={room}>
        <Box alignItems="center" gap={1}><Box width={14} flexShrink={0}><Text bold dimColor={!on}>{title}</Text></Box>{key && onOff(key)}</Box>
        {on && fields}
      </Box>
    )
  }
  const onOff = (key: Switch) => (
    <Box alignItems="center" gap={2}>
      {settings[key] ? <Text color="success">{w.on}</Text> : <Text dimColor>{w.off}</Text>}
      <Button key={key} label={settings[key] ? w.turnOff : w.turnOn} variant="secondary" onPress={() => save(key, !settings[key])} />
    </Box>
  )
  const model = (key: 'model' | 'liveModel' | 'cardModel') => field(w.model, (
    <Box gap={1} flexWrap="wrap">
      {LingoSettings.models().map(value => <Box flexShrink={0}><Button key={`${key}-${value}`} label={value} variant={value === settings[key] ? 'primary' : 'secondary'} onPress={() => save(key, value)} /></Box>)}
    </Box>
  ))
  const nudge = (by: 1 | -1, label: string) => <Button key={`livePause-${label}`} label={label} variant="secondary" onPress={() => save('livePause', LingoSettings.step(settings.livePause, by))} />
  // 入力中は欄の横に「⏎ submit」が出るので、その分も幅を取る。狭い面では折り返す
  const pause = (
    <Box alignItems="center" gap={1} flexWrap="wrap">
      <Box flexShrink={0}><Text dimColor>{w.fast}</Text></Box>{nudge(-1, '-')}
      <Box width={16} flexShrink={0} flexDirection="column"><Input key="livePause" value={settings.livePause} onSubmit={v => save('livePause', LingoSettings.pause(v, settings.livePause))} /></Box>
      <Text>{w.seconds}</Text>{nudge(1, '+')}<Box flexShrink={0}><Text dimColor>{w.slow}</Text></Box>
    </Box>
  )
  const text = (field: 'native' | 'target' | 'voice', placeholder?: string) => <Box width={28} flexDirection="column"><Input key={field} value={settings[field]} placeholder={placeholder} onSubmit={v => save(field, v)} /></Box>
  // レベルは自由記述なので残りの幅を使い、書く粒度（できること・苦手なこと）を例で見せる
  const level = <Box flexGrow={1} flexDirection="column"><Input key="level" value={settings.level} placeholder={w.levelExample} onSubmit={v => save('level', v)} /></Box>
  return (
    <Box flexDirection="column" gap={room * 2} paddingX={room * 2} paddingY={room}>
      {group('claudelingo', 'enabled')}
      {settings.enabled && [
        group(w.language, null, field(w.native, text('native')), field(w.target, text('target')), field(w.level, level)),
        group(w.afterSend, 'afterSend', model('model')),
        group(w.live, 'live', model('liveModel'), field(w.pause, pause)),
        group(w.card, 'card', model('cardModel')),
        group(w.readAloud, null, field(w.voice, text('voice', w.voiceHint))),
        grass,
      ]}
      {denied && <Text color="error">{w.saveFailed(denied)}</Text>}
    </Box>
  )
}
