import type { Elements, RenderElement } from 'claude-code'

import { TranslationSettings } from '../../../logic/translation-settings/translation-settings'

type Settings = ReturnType<typeof TranslationSettings.of>
type Save = (field: keyof Settings, value: string | boolean) => void

export const SETTINGS_PANE = 'claudelingo'

// /lingo の設定パネル：一番上は mod の有効・無効。押す・確定するとその場で保存し、失敗したら理由を赤で1行
// 選択肢は全部見せるボタン（選ばれている方を強調）。端末は行を詰め、それ以外の面は余白と行間を取る
export const settingsPane = (t: Elements[Exclude<keyof Elements, 'mobile'>], isTerminal: boolean, settings: Settings, denied: string, save: Save) => {
  const { Box, Text, Button, Input } = t
  const room = isTerminal ? 0 : 1
  const field = (label: string, control: RenderElement) => (
    <Box alignItems="center" gap={1}>
      <Box width={12}><Text dimColor>{label}</Text></Box>
      {control}
    </Box>
  )
  const choice = (field: keyof Settings, now: string, options: { value: string; label?: string }[]) => (
    <Box gap={1} flexWrap="wrap">
      {options.map(o => <Box flexShrink={0}><Button key={`${field}-${o.value}`} label={o.label ?? o.value} variant={o.value === now ? 'primary' : 'secondary'} onPress={() => save(field, typeof settings[field] === 'boolean' ? o.value === 'on' : o.value)} /></Box>)}
    </Box>
  )
  const onOff = (field: 'enabled' | 'live', now: boolean) => choice(field, now ? 'on' : 'off', [{ value: 'on', label: '有効' }, { value: 'off', label: '無効' }])
  const text = (field: 'native' | 'target') => <Box width={28} flexDirection="column"><Input key={field} value={settings[field]} onSubmit={v => save(field, v)} /></Box>
  return (
    <Box flexDirection="column" gap={room} paddingX={room * 2} paddingY={room}>
      {field('claudelingo', onOff('enabled', settings.enabled))}
      {field('母語', text('native'))}
      {field('学ぶ言語', text('target'))}
      {field('翻訳モデル', choice('model', settings.model, TranslationSettings.models().map(value => ({ value }))))}
      {field('入力中の校正', onOff('live', settings.live))}
      {field('校正モデル', choice('liveModel', settings.liveModel, TranslationSettings.models().map(value => ({ value }))))}
      {field('反応の速さ', choice('livePause', settings.livePause, TranslationSettings.pauses().map(value => ({ value, label: `${value}秒` }))))}
      {denied && <Text color="red">保存できませんでした：{denied}</Text>}
    </Box>
  )
}
