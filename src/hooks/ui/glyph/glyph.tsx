import type { Elements, RenderElement } from 'claude-code'

// 飾りのない絵文字一字のボタン。何が起こるかはホバーで上に小さく出す（右端で見切れないよう左へ伸ばす。行頭に置くなら toRight で右へ）
export const glyph = (t: Elements[keyof Elements], key: string, label: string, tip: string, press: () => void, toRight = false) => {
  const { Box, Button, Text } = t
  return (
    <Box key={`${key}-tip`}>
      <Button key={key} label={label} plain dimColor onPress={press} />
      <Box position="absolute" top={-1} {...(toRight ? { left: 0 } : { right: 0 })} display="none" hover={{ display: 'flex' }}><Text inverse>{` ${tip} `}</Text></Box>
    </Box>
  )
}

// 絵文字ボタンの並び。端末以外はボタンが自前の余白を持つので、間を詰めて文との間隔に揃える
export const glyphs = (t: Elements[keyof Elements], isTerminal: boolean, items: RenderElement[]) => {
  const { Box } = t
  return <Box gap={isTerminal ? 1 : 0}>{items}</Box>
}
