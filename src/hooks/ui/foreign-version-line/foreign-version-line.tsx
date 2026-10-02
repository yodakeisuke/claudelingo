import type { Elements, RenderElement } from 'claude-code'

// 指示の行の下に、外国語版を薄く。直した所（** で囲まれた所）は太字。アドバイスがあれば1点ずつ続けて
export function withForeignVersion(t: Elements[keyof Elements], row: RenderElement, line: { restated: string; tips: string[] }) {
  const { Box, Text } = t
  return (
    <Box flexDirection="column">
      {row}
      <Box><Text dimColor>  ↳ </Text><Text dimColor>{line.restated.split('**').map((part, i) => (i % 2 ? <Text bold>{part}</Text> : part))}</Text></Box>
      {line.tips.map(tip => <Box><Text dimColor>  💡 </Text><Text dimColor>{tip}</Text></Box>)}
    </Box>
  )
}
