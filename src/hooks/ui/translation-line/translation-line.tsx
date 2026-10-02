import type { Elements, RenderElement } from 'claude-code'

// 指示の行のすぐ下に外国語版を。Desktop で選択・コピーできる描き方は行番号つきの Code だけ（issue #5）。アドバイスがあれば1点ずつ続けて
export const withTranslation = (t: Elements[keyof Elements], row: RenderElement, line: { restated: string; tips: string[] }) => {
  const { Box, Code, Markdown } = t
  return (
    <Box flexDirection="column">
      {row}
      <Code source={line.restated} startLine={1} />
      {line.tips.map(tip => <Markdown dimColor text={`💡 ${tip}`} />)}
    </Box>
  )
}
