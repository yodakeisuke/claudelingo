import type { Elements } from 'claude-code'

import type { Shown } from '../../../types'
import { WordCards } from '../../../logic/word-card/word-card'

type Word = { label: string; word: string }

// 訳の行を、押せる語の並びで。飾りのないボタンは灰色の文字に見える（リンクは青になる）。絵が開いている語は濃く
// 記号だけの語（? や —）は押せない文字のまま。端末はボタンの間に空白が無いので、空白を挟む
export const wordLine = (t: Elements[keyof Elements], isTerminal: boolean, words: Word[], up: Set<string>, press: (word: string) => void) => {
  const { Box, Button, Text } = t
  return (
    <Box flexWrap="wrap">
      {words.map((w, i) => [
        isTerminal && i > 0 && <Text> </Text>,
        w.word ? <Button key={`word-${i}`} label={w.label} plain dimColor={!up.has(w.word)} onPress={() => press(w.word)} /> : <Text dimColor>{w.label}</Text>,
      ])}
    </Box>
  )
}

// 押した語の絵：句（太字）と拡大、動く絵、絵の一文（薄く）。描いている間と失敗は 1 行。絵を描けない端末では句と一文の 1 行
export const wordCard = (t: Elements[keyof Elements], isTerminal: boolean, shown: Shown, resize: (isWide: boolean) => void) => {
  const { Box, Text, Button } = t
  const { card } = shown
  if (!card) return <Box marginTop={1}><Text dimColor>{shown.isFailed ? `描けませんでした：${shown.word}` : `コアイメージを描画中… ${shown.word}`}</Text></Box>
  if (isTerminal || !('Svg' in t)) return <Box marginTop={1}><Text bold>{card.unit}  </Text><Text dimColor>{card.caption}</Text></Box>
  const { Svg } = t
  return (
    <Box flexDirection="column" alignItems="flex-start" gap={1} marginTop={1}>
      <Box gap={2} alignItems="center">
        <Text bold>{card.unit}</Text>
        <Button key={`resize-${shown.word}`} label={shown.isWide ? '縮小' : '拡大'} dimColor onPress={() => resize(!shown.isWide)} />
      </Box>
      <Svg {...WordCards.picture(card.svg, shown.isWide)} alt={card.caption} isInteractive />
      <Text dimColor>{card.caption}</Text>
    </Box>
  )
}
