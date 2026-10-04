import type { Elements, RenderElement } from 'claude-code'

import type { Wording } from '../../../locales/en'

import { Restatements } from '../../../logic/restatement/restatement'
import { speakerAndMicrophone, symbolLine } from '../read-aloud/read-aloud'
import type { Voice } from '../read-aloud/read-aloud'

type Line = ReturnType<typeof Restatements.of>

// 外国語版を薄く、直した所（** で囲んだ所）は薄くせず太字で。薄い Markdown は端末で太字が消えるので、分けて描く
const restated = (t: Elements[keyof Elements], text: string) => {
  const { Text } = t
  return <Text>{Restatements.parts(text).map((part, i) => (i % 2 ? <Text bold>{part}</Text> : <Text dimColor>{part}</Text>))}</Text>
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

// 指示の行のすぐ下に、その外国語版（押せる語の並びがあればそれで）と、訳せたときは読み上げと話す練習。読み上げを押すとその下に発音記号。アドバイスは見出し「💡 ヒント」の下に「•」で、少し空けて並べ、単語の絵は 1 行空けて続ける
export const withTranslation = (t: Elements[keyof Elements], w: Wording, isTerminal: boolean, id: string, row: RenderElement, line: Line, voice?: Voice, words?: RenderElement, cards: RenderElement[] = []) => {
  const { Box, Markdown, Text } = t
  return (
    <Box flexDirection="column" marginBottom={cards.length > 0 || line.tips.length > 0 ? 1 : 0}>
      {row}
      <Box alignItems="flex-start" gap={1}>
        <Box flexShrink={1}>{words ?? restated(t, line.restated)}</Box>
        {voice && speakerAndMicrophone(t, w, isTerminal, { speak: `${id}-speak`, practise: `${id}-practise` }, () => voice.sayWithSymbols(line.restated), () => voice.practise(line.restated))}
      </Box>
      {voice && symbolLine(t, w, voice.symbols(line.restated))}
      {line.tips.length > 0 && (
        <Box flexDirection="column" marginTop={1} gap={0.5}>
          <Text dimColor bold>{`💡 ${w.tips}`}</Text>
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
