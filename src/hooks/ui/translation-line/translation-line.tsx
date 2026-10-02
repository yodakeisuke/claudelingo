import type { Elements, RenderElement } from 'claude-code'

// 指示の行のすぐ下に、外国語版を薄く。Markdown で描く（直した所の ** が太字になり、文字を選択できる）。アドバイスがあれば1点ずつ続けて
// 指示が右に寄る面（端末以外）では、訳も右に寄せて指示の真下に置く
export const withTranslation = (t: Elements[keyof Elements], isTerminal: boolean, row: RenderElement, line: { restated: string; tips: string[] }) => {
  const { Box, Markdown } = t
  const side = isTerminal ? 'flex-start' : 'flex-end'
  return (
    <Box flexDirection="column" alignItems={side}>
      {row}
      <Markdown dimColor text={`↳ ${line.restated}`} />
      {line.tips.map(tip => <Markdown dimColor text={`💡 ${tip}`} />)}
    </Box>
  )
}
