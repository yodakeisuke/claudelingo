import type { Elements, RenderElement } from 'claude-code'

// 指示の行の下に、外国語版を薄く。アドバイスがあれば1点ずつ続けて
export function withForeignVersion(t: Elements[keyof Elements], row: RenderElement, line: { restated: string; tips: string[] }) {
  const { Box, Text } = t
  return (
    <Box flexDirection="column">
      {row}
      <Box><Text dimColor>  ↳ </Text><Text dimColor>{line.restated}</Text></Box>
      {line.tips.map(tip => <Box><Text dimColor>  💡 </Text><Text dimColor>{tip}</Text></Box>)}
    </Box>
  )
}
