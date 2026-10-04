import type { Elements } from 'claude-code'

import type { Wording } from '../../../locales/en'
import { translationLine } from '../translation-line/translation-line'

// 入力欄の上に、打ちかけの校正。言い直しが下書きと違えば、頭に小さく「置換」。右上に閉じる ✕
// 端末の右端 4 マスは、帯の折りたたみ印 [-] に重ならないよう空ける（Desktop に印はない）
export const draftBand = (t: Elements[keyof Elements], w: Wording, isTerminal: boolean, line: Parameters<typeof translationLine>[1], close: () => void, replace?: () => void) => {
  const { Box, Button } = t
  return (
    <Box flexDirection="row" gap={1} paddingRight={isTerminal ? 4 : 0}>
      {replace && <Box flexShrink={0}><Button key="replace" label={w.replace} onPress={replace} /></Box>}
      <Box flexGrow={1} flexShrink={1}>{translationLine(t, line)}</Box>
      <Box flexShrink={0} alignSelf="flex-start"><Button key="draft-close" label="✕" plain dimColor role="dismiss" onPress={close} /></Box>
    </Box>
  )
}
