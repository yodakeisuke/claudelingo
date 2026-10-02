import type { Elements, RenderElement } from 'claude-code'

// 指示の行の下に、外国語版を薄く1行
export function withForeignVersion(t: Elements[keyof Elements], row: RenderElement, text: string) {
  const { Box, Text } = t
  return (
    <Box flexDirection="column">
      {row}
      <Text dimColor>  ↳ {text}</Text>
    </Box>
  )
}
