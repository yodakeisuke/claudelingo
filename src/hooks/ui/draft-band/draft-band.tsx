import type { Elements } from 'claude-code'

import type { Wording } from '../../../locales/en'
import { ticker } from '../ticker/ticker'
import { translationLine } from '../translation-line/translation-line'

// 入力欄の上に、打ちかけの校正。言い直しが下書きと違えば、頭に小さく「置換」。右上に閉じる ✕。打ち始めたら古い校正として薄く、次を頼んでいる間は頭に回る印
// 端末の右端 4 マスは、帯の折りたたみ印 [-] に重ならないよう空ける（Desktop に印はない）
export const draftBand = (t: Elements[keyof Elements], w: Wording, isTerminal: boolean, line: Parameters<typeof translationLine>[1], close: () => void, replace?: () => void, { isStale = false, isAsking = false } = {}) => {
  const { Box, Button } = t
  return (
    <Box flexDirection="row" gap={1} paddingRight={isTerminal ? 4 : 0}>
      {isAsking && <Box flexShrink={0}>{ticker(t, isTerminal, 'draft-asking', 'wait', '')}</Box>}
      {replace && <Box flexShrink={0}><Button key="replace" label={w.replace} dimColor={isStale} onPress={replace} /></Box>}
      <Box flexGrow={1} flexShrink={1}>{translationLine(t, line, isStale)}</Box>
      <Box flexShrink={0} alignSelf="flex-start"><Button key="draft-close" label="✕" plain dimColor role="dismiss" onPress={close} /></Box>
    </Box>
  )
}
