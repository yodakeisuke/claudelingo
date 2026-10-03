import type { Elements, RenderElement } from 'claude-code'

import { glyph } from '../glyph/glyph'
import { speaker } from '../read-aloud/read-aloud'

export const REPLY_PANE = 'claudelingo-reply'

// 返事のブロック：Claude Code が描いた返事はそのまま、その下に訳を横のパネルに出す 🌐。端末の返事の頭の行の後は indent だけ下げて本文にそろえる
export const replyBlock = (t: Elements[keyof Elements], key: string, row: RenderElement, indent: number, press: () => void) => {
  const { Box } = t
  return (
    <Box flexDirection="column">
      {row}
      <Box paddingLeft={indent}>{glyph(t, `${key}-translate`, '🌐', '訳を横に出す', press, true)}</Box>
    </Box>
  )
}

// 訳のパネル：どの返事の訳か分かるよう頭に返事の書き出し（薄く、パネルの幅で 1 行に切る）、段落ごとの訳を少し空けて並べ、最後に読み上げ。訳している間などは訳の代わりに一言
export const replyPane = (t: Elements[keyof Elements], key: string, head: string, translations: RenderElement[], note?: string, speak?: () => void) => {
  const { Box, Text } = t
  return (
    <Box flexDirection="column" gap={1}>
      {head && <Text dimColor wrap="truncate-end">{head}</Text>}
      {translations}
      {note && <Text dimColor>{note}</Text>}
      {speak && <Box>{speaker(t, `${key}-speak`, speak, true)}</Box>}
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
