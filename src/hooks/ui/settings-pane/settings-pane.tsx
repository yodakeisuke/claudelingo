import type { Elements, RenderElement } from 'claude-code'

import { TranslationSettings } from '../../../logic/translation-settings/translation-settings'

type Settings = ReturnType<typeof TranslationSettings.of>
type Switch = 'enabled' | 'afterSend' | 'live' | 'card'
type Save = (field: keyof Settings, value: string | boolean) => void

export const SETTINGS_PANE = 'claudelingo'

// /lingo の設定パネル：オン・オフは状態の文字と切り替えボタン。オフのまとまりは見出しだけ、mod ごとオフなら他のまとまりも出さない
// 押す・確定するとその場で保存し、失敗したら理由を赤で1行。端末は行を詰め、それ以外の面は余白と行間を取る
export const settingsPane = (t: Elements[Exclude<keyof Elements, 'mobile'>], isTerminal: boolean, settings: Settings, denied: string, save: Save, grass: RenderElement) => {
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
      {settings[key] ? <Text color="success">● オン</Text> : <Text dimColor>○ オフ</Text>}
      <Button key={key} label={settings[key] ? 'オフにする' : 'オンにする'} variant="secondary" onPress={() => save(key, !settings[key])} />
    </Box>
  )
  const model = (key: 'model' | 'liveModel' | 'cardModel') => field('モデル', (
    <Box gap={1} flexWrap="wrap">
      {TranslationSettings.models().map(value => <Box flexShrink={0}><Button key={`${key}-${value}`} label={value} variant={value === settings[key] ? 'primary' : 'secondary'} onPress={() => save(key, value)} /></Box>)}
    </Box>
  ))
  const nudge = (by: 1 | -1, label: string) => <Button key={`livePause-${label}`} label={label} variant="secondary" onPress={() => save('livePause', TranslationSettings.step(settings.livePause, by))} />
  // 入力中は欄の横に「⏎ submit」が出るので、その分も幅を取る。狭い面では折り返す
  const pause = (
    <Box alignItems="center" gap={1} flexWrap="wrap">
      <Box flexShrink={0}><Text dimColor>速い</Text></Box>{nudge(-1, '-')}
      <Box width={16} flexShrink={0} flexDirection="column"><Input key="livePause" value={settings.livePause} onSubmit={v => save('livePause', TranslationSettings.pause(v, settings.livePause))} /></Box>
      <Text>秒</Text>{nudge(1, '+')}<Box flexShrink={0}><Text dimColor>遅い</Text></Box>
    </Box>
  )
  const text = (field: 'native' | 'target' | 'voice', placeholder?: string) => <Box width={28} flexDirection="column"><Input key={field} value={settings[field]} placeholder={placeholder} onSubmit={v => save(field, v)} /></Box>
  // レベルは自由記述なので残りの幅を使い、書く粒度（できること・苦手なこと）を例で見せる
  const level = <Box flexGrow={1} flexDirection="column"><Input key="level" value={settings.level} placeholder="例: 技術文書は読める。書くと冠詞・前置詞が怪しい" onSubmit={v => save('level', v)} /></Box>
  return (
    <Box flexDirection="column" gap={room * 2} paddingX={room * 2} paddingY={room}>
      {group('claudelingo', 'enabled')}
      {settings.enabled && [
        group('言語', null, field('母語', text('native')), field('学ぶ言語', text('target')), field('今のレベル', level)),
        group('送った後の訳', 'afterSend', model('model')),
        group('入力中の校正', 'live', model('liveModel'), field('反応の速さ', pause)),
        group('単語の絵', 'card', model('cardModel')),
        group('読み上げ', null, field('声', text('voice', 'Mac の声の名前（システム設定 › アクセシビリティ › リーダーと読み上げ）'))),
        grass,
      ]}
      {denied && <Text color="error">保存できませんでした：{denied}</Text>}
    </Box>
  )
}
