import type { Elements, RenderElement } from 'claude-code'

type Line = { restated: string; tips: string[] }

// 外国語版を薄く。Markdown で描く（直した所の ** が太字になる）。アドバイスがあれば1点ずつ続けて
export const translationLine = (t: Elements[keyof Elements], line: Line) => {
  const { Box, Markdown } = t
  return (
    <Box flexDirection="column">
      <Markdown dimColor text={line.restated} />
      {line.tips.map(tip => <Markdown dimColor text={`💡 ${tip}`} />)}
    </Box>
  )
}

// 指示の行のすぐ下に、その外国語版
export const withTranslation = (t: Elements[keyof Elements], row: RenderElement, line: Line) => {
  const { Box } = t
  return (
    <Box flexDirection="column">
      {row}
      {translationLine(t, line)}
    </Box>
  )
}
