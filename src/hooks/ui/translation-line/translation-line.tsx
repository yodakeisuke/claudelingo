import type { Elements, RenderElement } from 'claude-code'

import { PromptTranslations } from '../../../logic/prompt-translation/prompt-translation'

type Line = NonNullable<ReturnType<typeof PromptTranslations.line>>

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

// 指示の行のすぐ下に、その外国語版（押せる語の並びがあればそれで）。アドバイスは見出し「💡 ヒント」の下にまとめ、単語の絵は 1 行空けて続ける
export const withTranslation = (t: Elements[keyof Elements], row: RenderElement, line: Line, words?: RenderElement, cards: RenderElement[] = []) => {
  const { Box, Markdown, Text } = t
  return (
    <Box flexDirection="column" marginBottom={cards.length > 0 || line.tips.length > 0 ? 1 : 0}>
      {row}
      {words ?? <Markdown dimColor text={line.restated} />}
      {line.tips.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor bold>💡 ヒント</Text>
          {line.tips.map(tip => <Markdown dimColor text={tip} />)}
        </Box>
      )}
      {cards}
    </Box>
  )
}
