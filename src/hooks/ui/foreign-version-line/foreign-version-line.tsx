import type { Elements, RenderElement } from 'claude-code'

// 指示の行のすぐ下に、外国語版を薄く。直した所（** で囲まれた所）は太字。アドバイスがあれば1点ずつ続けて
// 指示が右に寄る面（端末以外）では、訳も右に寄せて指示の真下に置く
export function withForeignVersion(t: Elements[keyof Elements], isTerminal: boolean, row: RenderElement, line: { restated: string; tips: string[] }) {
  const { Box, Text } = t
  const side = isTerminal ? 'flex-start' : 'flex-end'
  return (
    <Box flexDirection="column" alignItems={side}>
      {row}
      <Box><Text color="inactive">  ↳ {line.restated.split('**').map((part, i) => (i % 2 ? <Text bold>{part}</Text> : part))}</Text></Box>
      {line.tips.map(tip => <Box><Text color="inactive">  💡 {tip}</Text></Box>)}
    </Box>
  )
}
