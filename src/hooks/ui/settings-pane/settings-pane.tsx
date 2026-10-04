import type { Elements, RenderElement } from 'claude-code'

import type { Wording } from '../../../locales/en'
import { LingoSettings } from '../../../logic/lingo-settings/lingo-settings'

type Settings = ReturnType<typeof LingoSettings.of>
type Switch = 'enabled' | 'afterSend' | 'live' | 'card'
type Save = (field: keyof Settings, value: string | boolean) => void

export const SETTINGS_PANE = 'claudelingo'

// /lingo の設定パネル：オン・オフは状態の文字と切り替えボタン。オフのまとまりは見出しだけ、mod ごとオフなら他のまとまりも出さない
// 押す・選ぶ・確定するとその場で保存し、失敗したら理由を赤で1行。狭い横のパネルでも縦に収まるよう、どの設定も1行に収める
export const settingsPane = (t: Elements[Exclude<keyof Elements, 'mobile'>], w: Wording, isTerminal: boolean, settings: Settings, denied: string, save: Save, grass: RenderElement) => {
  const { Box, Text, Button, Input, Select } = t
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
      <Box flexShrink={0}>{settings[key] ? <Text color="success">{`● ${w.on}`}</Text> : <Text dimColor>{`○ ${w.off}`}</Text>}</Box>
      <Button key={key} label={settings[key] ? w.turnOff : w.turnOn} variant="secondary" onPress={() => save(key, !settings[key])} />
    </Box>
  )
  const model = (key: 'model' | 'liveModel' | 'cardModel') => field(w.model, <Select key={key} options={LingoSettings.models().map(value => ({ value }))} value={settings[key]} onSelect={value => save(key, value)} />)
  const nudge = (by: 1 | -1, label: string) => <Button key={`livePause-${label}`} label={label} variant="secondary" onPress={() => save('livePause', LingoSettings.step(settings.livePause, by))} />
  // 欄は数が収まる幅だけ取る。狭い面では折り返す
  const pause = (
    <Box alignItems="center" gap={1} flexWrap="wrap">
      {nudge(-1, '-')}
      <Box width={6} flexShrink={0} flexDirection="column"><Input key="livePause" value={settings.livePause} onSubmit={v => save('livePause', LingoSettings.pause(v, settings.livePause))} /></Box>
      <Text>{w.seconds}</Text>{nudge(1, '+')}
    </Box>
  )
  const text = (field: 'native' | 'target' | 'voice', placeholder?: string) => <Box width={28} minWidth={0} flexShrink={1} flexDirection="column"><Input key={field} value={settings[field]} placeholder={placeholder} onSubmit={v => save(field, LingoSettings.entered(field, v, settings[field]))} /></Box>
  // 欄は minWidth 0 で狭い面に合わせて縮む。レベルは自由記述なので残りの幅を使い、書く粒度（できること・苦手なこと）を例で見せる
  const level = <Box flexGrow={1} minWidth={0} flexDirection="column"><Input key="level" value={settings.level} placeholder={w.levelExample} onSubmit={v => save('level', v)} /></Box>
  return (
    <Box flexDirection="column" gap={room} paddingX={room * 2} paddingY={room}>
      {group('claudelingo', 'enabled')}
      {settings.enabled && [
        // 基本のモデルは送った後の訳のほか、返事の訳・発音記号・コーチ・例文などにも使うので、いつも見える所に
        group(w.basics, null, field(w.native, text('native')), field(w.target, text('target')), field(w.level, level), model('model')),
        group(w.afterSend, 'afterSend'),
        group(w.live, 'live', model('liveModel'), field(w.pause, pause)),
        group(w.card, 'card', model('cardModel')),
        group(w.readAloud, null, field(w.voice, text('voice', w.voiceHint))),
        grass,
      ]}
      {denied && <Text color="error">{w.saveFailed(denied)}</Text>}
    </Box>
  )
}
