import type { Elements, RenderElement } from 'claude-code'

import { LanguageSettings } from '../../../logic/language-settings/language-settings'

type Settings = ReturnType<typeof LanguageSettings.of>
type Save = (field: keyof Settings, value: string | boolean) => void

export const SETTINGS_PANE = 'claudelingo'

// /lingo の設定パネル：選ぶ・Enter で即保存。項目名と入力欄はそれぞれ同じ幅に揃える。保存が拒否されたら理由を赤で1行
// 端末は行を詰め、それ以外の面は余白と行間を取る
export function settingsPane(t: Elements[Exclude<keyof Elements, 'mobile'>], isTerminal: boolean, settings: Settings, denied: string, save: Save) {
  const { Box, Text, Select, Input } = t
  const room = isTerminal ? 0 : 1
  const field = (label: string, control: RenderElement) => (
    <Box alignItems="center" gap={1}>
      <Box width={12}><Text dimColor>{label}</Text></Box>
      <Box width={28} flexDirection="column">{control}</Box>
    </Box>
  )
  return (
    <Box flexDirection="column" gap={room} paddingX={room * 2} paddingY={room}>
      {field('指示の訳', <Select key="enabled" value={settings.enabled ? 'on' : 'off'} options={[{ value: 'on', label: '表示する' }, { value: 'off', label: '表示しない' }]} onSelect={v => save('enabled', v === 'on')} />)}
      {field('母語', <Input key="native" value={settings.native} onSubmit={v => save('native', v.trim() || settings.native)} />)}
      {field('学ぶ言語', <Input key="target" value={settings.target} onSubmit={v => save('target', v.trim() || settings.target)} />)}
      {field('翻訳モデル', <Select key="model" value={settings.model} options={LanguageSettings.models().map(value => ({ value }))} onSelect={v => save('model', v)} />)}
      {denied && <Text color="red">保存できませんでした：{denied}</Text>}
      <Text dimColor>変更はすぐ反映されます</Text>
    </Box>
  )
}
