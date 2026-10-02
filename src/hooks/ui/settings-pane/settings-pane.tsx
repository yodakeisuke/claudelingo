import type { Elements, RenderElement } from 'claude-code'

import { LanguageSettings } from '../../../logic/language-settings/language-settings'

type Settings = ReturnType<typeof LanguageSettings.of>
type Save = (field: keyof Settings, value: string | boolean) => void

export const SETTINGS_PANE = 'claudelingo'

// /lingo の設定パネル：押す・Enter で即保存。選択肢は全部見せて1回で選べるボタンに（選ばれている方が強調）
// 一番上は mod そのものの有効・無効。項目名と入力欄は幅を揃える。保存が拒否されたら理由を赤で1行
// 端末は行を詰め、それ以外の面は余白と行間を取る
export function settingsPane(t: Elements[Exclude<keyof Elements, 'mobile'>], isTerminal: boolean, settings: Settings, denied: string, write: Save) {
  const { Box, Text, Button, Input } = t
  // 変わっていない値は保存しない（入力欄は外をクリックしただけでも確定が飛び、他の項目を古い値で書き戻すことがあった）
  const save: Save = (field, value) => { if (value !== settings[field]) write(field, value) }
  const room = isTerminal ? 0 : 1
  const field = (label: string, control: RenderElement) => (
    <Box alignItems="center" gap={1}>
      <Box width={12}><Text dimColor>{label}</Text></Box>
      {control}
    </Box>
  )
  const choice = (field: keyof Settings, now: string, options: { value: string; label?: string }[]) => (
    <Box gap={1}>
      {options.map(o => <Button key={`${field}-${o.value}`} label={o.label ?? o.value} variant={o.value === now ? 'primary' : 'secondary'} onPress={() => save(field, field === 'enabled' ? o.value === 'on' : o.value)} />)}
    </Box>
  )
  const text = (field: 'native' | 'target') => <Box width={28} flexDirection="column"><Input key={field} value={settings[field]} onSubmit={v => save(field, v.trim() || settings[field])} /></Box>
  return (
    <Box flexDirection="column" gap={room} paddingX={room * 2} paddingY={room}>
      {field('claudelingo', choice('enabled', settings.enabled ? 'on' : 'off', [{ value: 'on', label: '有効' }, { value: 'off', label: '無効' }]))}
      {field('母語', text('native'))}
      {field('学ぶ言語', text('target'))}
      {field('翻訳モデル', choice('model', settings.model, LanguageSettings.models().map(value => ({ value }))))}
      {denied && <Text color="red">保存できませんでした：{denied}</Text>}
    </Box>
  )
}
