import type { Elements } from 'claude-code'

import { translationLine } from '../translation-line/translation-line'

// 入力欄の上に、打ちかけの校正。言い直しが下書きと違えば、頭に小さく「置換」
// 右端の 4 マスは、帯の折りたたみ印 [-] に重ならないよう空ける
export const draftBand = (t: Elements[keyof Elements], line: Parameters<typeof translationLine>[1], replace?: () => void) => {
  const { Box, Button } = t
  return (
    <Box flexDirection="row" gap={1} paddingRight={4}>
      {replace && <Box flexShrink={0}><Button key="replace" label="置換" onPress={replace} /></Box>}
      <Box flexGrow={1} flexShrink={1}>{translationLine(t, line)}</Box>
    </Box>
  )
}
