import type { Elements } from 'claude-code'

import { LanguageSettings } from '../../../logic/language-settings/language-settings'

type Settings = ReturnType<typeof LanguageSettings.of>
type Save = (field: keyof Settings, value: string | boolean) => void

export const SETTINGS_PANE = 'claudelingo'

// /lingo の設定パネル：選ぶ・Enter で即保存。保存が拒否されたら理由を赤で1行
export function settingsPane(t: Elements[Exclude<keyof Elements, 'mobile'>], settings: Settings, denied: string, save: Save) {
  const { Box, Text, Select, Input } = t
  return (
    <Box flexDirection="column">
      <Text bold>claudelingo</Text>
      <Select key="enabled" label="外国語版" value={settings.enabled ? 'on' : 'off'} options={[{ value: 'on', label: 'オン' }, { value: 'off', label: 'オフ' }]} onSelect={v => save('enabled', v === 'on')} />
      <Input key="native" label="母語" value={settings.native} onSubmit={v => save('native', v.trim() || settings.native)} />
      <Input key="target" label="学ぶ言語" value={settings.target} onSubmit={v => save('target', v.trim() || settings.target)} />
      <Select key="model" label="翻訳モデル" value={settings.model} options={LanguageSettings.models().map(value => ({ value }))} onSelect={v => save('model', v)} />
      {denied && <Text color="red">保存できませんでした：{denied}</Text>}
      <Text dimColor>変更はすぐ反映 · Esc で閉じる</Text>
    </Box>
  )
}
