import type { Elements, RenderElement } from 'claude-code'

// 返事のブロック：段落の行（空きは Claude Code の行が持つ）と、その下の訳。最初の行の後は indent だけ下げて本文にそろえ、最後に 1 行空けて「訳」ボタンか、訳している間などの一言
export const replyBlock = (t: Elements[keyof Elements], paragraphs: { row: RenderElement; translation?: RenderElement }[], indent: number, button?: { label: string; press: () => void }, note?: string) => {
  const { Box, Button, Text } = t
  const [first, ...rest] = paragraphs
  return (
    <Box flexDirection="column">
      {first?.row}
      <Box flexDirection="column" paddingLeft={indent}>
        {first?.translation}
        {rest.map(p => [p.row, p.translation])}
        {button && <Box marginTop={1}><Button key="reply-translate" label={button.label} dimColor onPress={button.press} /></Box>}
        {note && <Box marginTop={1}><Text dimColor>{note}</Text></Box>}
      </Box>
    </Box>
  )
}

// 段落の訳：押せる語の並び（無ければ薄い文）と、開いている絵
export const paragraphTranslation = (t: Elements[keyof Elements], restated: string, words?: RenderElement, cards: RenderElement[] = []) => {
  const { Box, Markdown } = t
  return (
    <Box flexDirection="column">
      {words ?? <Markdown dimColor text={restated} />}
      {cards}
    </Box>
  )
}
