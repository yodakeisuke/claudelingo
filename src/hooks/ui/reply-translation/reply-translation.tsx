import type { Elements, RenderElement } from 'claude-code'

// 返事のブロック：段落（訳があればその下に訳）を 1 行ずつ空けて並べ、最後に「訳」ボタンか、訳している間などの一言
export const replyBlock = (t: Elements[keyof Elements], paragraphs: RenderElement[], button?: { label: string; press: () => void }, note?: string) => {
  const { Box, Button, Text } = t
  return (
    <Box flexDirection="column" gap={1}>
      {paragraphs}
      {button && <Box><Button key="reply-translate" label={button.label} dimColor onPress={button.press} /></Box>}
      {note && <Text dimColor>{note}</Text>}
    </Box>
  )
}
