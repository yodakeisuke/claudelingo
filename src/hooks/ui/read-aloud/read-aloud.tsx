import type { Elements } from 'claude-code'

import type { Wording } from '../../../locales/en'

import { glyph, glyphs } from '../glyph/glyph'
import { ticker } from '../ticker/ticker'

// 読ませる手と、読ませた文の発音記号（頼んでいなければ undefined、書いている間は null）と、その文を読み上げている数。practise はその文を話す練習を開く
export type Voice = { say: (text: string) => void; sayWithSymbols: (text: string) => void; symbols: (text: string) => string | null | undefined; speaking: (text: string) => number; practise: (sample: string, pron?: string) => void }

// 読み上げボタン：押すとその文を読む。読んでいる間は横に音の棒（重ねて押したら ×数）
export const speaker = (t: Elements[keyof Elements], w: Wording, isTerminal: boolean, key: string, press: () => void, toRight = false, playing = 0) => {
  const { Box } = t
  const button = glyph(t, key, '🔊', w.speak, press, toRight)
  return playing > 0 ? <Box gap={1}>{button}{ticker(t, isTerminal, `${key}-sound`, 'sound', playing > 1 ? `×${playing}` : '')}</Box> : button
}

// 読み上げと話す練習の対
export const speakerAndMicrophone = (t: Elements[keyof Elements], w: Wording, isTerminal: boolean, keys: { speak: string; practise: string }, say: () => void, practise: () => void, playing = 0) =>
  glyphs(t, isTerminal, [speaker(t, w, isTerminal, keys.speak, say, false, playing), glyph(t, keys.practise, '🎤', w.practise, practise)])

// 読み上げた文の発音記号を薄い斜体で（本文と見分ける）。書いている間は回る一言、頼んでいなければ何も出さない
export const symbolLine = (t: Elements[keyof Elements], w: Wording, isTerminal: boolean, key: string, symbol: string | null | undefined) => {
  const { Text } = t
  return symbol === undefined ? undefined : symbol === null ? ticker(t, isTerminal, key, 'wait', w.writingSymbols) : <Text dimColor italic>{symbol}</Text>
}
