import type { Elements, RenderElement } from 'claude-code'

import { PromptTranslations } from '../../../logic/prompt-translation/prompt-translation'

type Line = NonNullable<ReturnType<typeof PromptTranslations.line>>

// 外国語版を薄く、直した所（** で囲んだ所）は薄くせず太字で。薄い Markdown は端末で太字が消えるので、分けて描く
const restated = (t: Elements[keyof Elements], text: string) => {
  const { Text } = t
  return <Text>{text.split('**').map((part, i) => (i % 2 ? <Text bold>{part}</Text> : <Text dimColor>{part}</Text>))}</Text>
}

// 外国語版と、アドバイスがあれば1点ずつ続けて
export const translationLine = (t: Elements[keyof Elements], line: Line) => {
  const { Box, Markdown } = t
  return (
    <Box flexDirection="column">
      {restated(t, line.restated)}
      {line.tips.map(tip => <Markdown dimColor text={`💡 ${tip}`} />)}
    </Box>
  )
}

// 指示の行のすぐ下に、その外国語版（押せる語の並びがあればそれで）。アドバイスは見出し「💡 ヒント」の下に「•」で、少し空けて並べ、単語の絵は 1 行空けて続ける
export const withTranslation = (t: Elements[keyof Elements], row: RenderElement, line: Line, words?: RenderElement, cards: RenderElement[] = []) => {
  const { Box, Markdown, Text } = t
  return (
    <Box flexDirection="column" marginBottom={cards.length > 0 || line.tips.length > 0 ? 1 : 0}>
      {row}
      {words ?? restated(t, line.restated)}
      {line.tips.length > 0 && (
        <Box flexDirection="column" marginTop={1} gap={0.5}>
          <Text dimColor bold>💡 ヒント</Text>
          <Box flexDirection="column" gap={0.5}>
            {line.tips.map(tip => (
              <Box gap={1} alignItems="flex-start">
                <Text dimColor>•</Text>
                <Box flexShrink={1}><Markdown dimColor text={tip} /></Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}
      {cards}
    </Box>
  )
}
