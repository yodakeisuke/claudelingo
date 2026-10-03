import type { Elements, RenderElement } from 'claude-code'

import { speaker } from '../read-aloud/read-aloud'

// 返事のブロック：段落の行（空きは Claude Code の行が持つ）、その発音記号、その下の訳。最初の行の後は indent だけ下げて本文にそろえる
// 最後に 1 行空けて「訳」ボタン（訳した後は読み上げも）か、訳している間などの一言
export const replyBlock = (t: Elements[keyof Elements], paragraphs: { row: RenderElement; symbol?: RenderElement; translation?: RenderElement }[], indent: number, button?: { label: string; press: () => void }, note?: string, speak?: () => void) => {
  const { Box, Button, Text } = t
  const [first, ...rest] = paragraphs
  return (
    <Box flexDirection="column">
      {first?.row}
      <Box flexDirection="column" paddingLeft={indent}>
        {first?.symbol}
        {first?.translation}
        {rest.map(p => [p.row, p.symbol, p.translation])}
        {button && (
          <Box marginTop={1} gap={1} alignItems="center">
            <Button key="reply-translate" label={button.label} dimColor onPress={button.press} />
            {speak && speaker(t, 'reply-speak', speak)}
          </Box>
        )}
        {note && <Box marginTop={1}><Text dimColor>{note}</Text></Box>}
      </Box>
    </Box>
  )
}

// 段落の訳：行ごとの押せる語の並び（無ければ薄い文）、読み上げた後はその発音記号、開いている絵
export const paragraphTranslation = (t: Elements[keyof Elements], restated: string, symbol?: RenderElement, lines?: RenderElement[], cards: RenderElement[] = []) => {
  const { Box, Markdown } = t
  return (
    <Box flexDirection="column">
      {lines ?? <Markdown dimColor text={restated} />}
      {symbol}
      {cards}
    </Box>
  )
}
