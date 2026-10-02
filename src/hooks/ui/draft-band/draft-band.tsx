import type { Elements } from 'claude-code'

// 入力欄の上に、打ちかけの外国語版と、その続き。続きはボタンで入力欄の末尾に足せる（Tab は mod に届かない）
export const draftBand = (t: Elements[keyof Elements], band: { restated: string; next: string }, addNext: () => void) => {
  const { Box, Markdown, Button } = t
  return (
    <Box flexDirection="column">
      <Markdown dimColor text={band.restated} />
      {band.next && (
        <Box flexDirection="row" gap={1}>
          <Markdown dimColor text={`→ ${band.next}`} />
          <Button label="続きを入れる" onPress={addNext} />
        </Box>
      )}
    </Box>
  )
}
