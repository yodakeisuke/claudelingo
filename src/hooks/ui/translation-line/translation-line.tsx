import type { Elements, RenderElement } from 'claude-code'

// 外国語版は指示の吹き出しの中に続ける（Desktop で選択・コピーできるのは engine の吹き出しの中だけ。issue #5）
export const withRestated = (text: string, restated: string) => `${text}\n\n↳ ${restated}`

// 指示の行のすぐ下に、アドバイスを薄く1点ずつ
export const withTranslation = (t: Elements[keyof Elements], row: RenderElement, tips: string[]) => {
  const { Box, Markdown } = t
  return (
    <Box flexDirection="column">
      {row}
      {tips.map(tip => <Markdown dimColor text={`💡 ${tip}`} />)}
    </Box>
  )
}
