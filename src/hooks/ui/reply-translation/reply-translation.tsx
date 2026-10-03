import type { Elements, RenderElement } from 'claude-code'

import { glyph, speaker } from '../read-aloud/read-aloud'

// 返事のブロック：段落の行（空きは Claude Code の行が持つ）、その発音記号、その下の訳。最初の行の後は indent だけ下げて本文にそろえる
// 最後に 1 行空けて訳している間などの一言。訳すボタン（訳した後は読み上げも）は、ポインタが届く面では返事に乗せた間だけ最後の行の右端に 🌐 で重ね（本文を動かさない。ブロックの外はデスクトップでは描けない）、🌐 に乗せると何のボタンかを出す。端末の通常の画面は過去の返事がポインタに反応しないので、最後に 1 行空けて文字のボタンで
export const replyBlock = (t: Elements[keyof Elements], paragraphs: { row: RenderElement; symbol?: RenderElement; translation?: RenderElement }[], indent: number, isTerminal: boolean, hoverable: boolean, button?: { label: string; press: () => void }, note?: string, speak?: () => void) => {
  const { Box, Button, Text } = t
  const [first, ...rest] = paragraphs
  const actions = button && (hoverable
    ? (
        <Box position="absolute" bottom={0} right={0} gap={isTerminal ? 1 : 0} display="none" hover={{ display: 'flex' }}>
          {glyph(t, 'reply-translate', '🌐', button.label, button.press)}
          {speak && speaker(t, 'reply-speak', speak)}
        </Box>
      )
    : (
        <Box marginTop={1} gap={1} alignItems="center">
          <Button key="reply-translate" label={button.label} dimColor onPress={button.press} />
          {speak && speaker(t, 'reply-speak', speak)}
        </Box>
      ))
  return (
    <Box key="reply" flexDirection="column">
      {first?.row}
      <Box flexDirection="column" paddingLeft={indent}>
        {first?.symbol}
        {first?.translation}
        {rest.map(p => [p.row, p.symbol, p.translation])}
        {!hoverable && actions}
        {note && <Box marginTop={1}><Text dimColor>{note}</Text></Box>}
      </Box>
      {hoverable && actions}
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
