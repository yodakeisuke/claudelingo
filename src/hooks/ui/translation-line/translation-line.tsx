import type { Elements, RenderElement } from 'claude-code'

// 指示の行のすぐ下に、外国語版を薄く。Markdown で描く（直した所の ** が太字になり、文字を選択できる）。アドバイスがあれば1点ずつ続けて
export const withTranslation = (t: Elements[keyof Elements], row: RenderElement, line: { restated: string; tips: string[] }) => {
  const { Box, Markdown } = t
  return (
    <Box flexDirection="column">
      {row}
      <Markdown dimColor text={line.restated} />
      {line.tips.map(tip => <Markdown dimColor text={`💡 ${tip}`} />)}
    </Box>
  )
}
