import type { Elements } from 'claude-code'

import { glyph, glyphs } from '../glyph/glyph'

// 読ませる手と、読ませた文の発音記号（頼んでいなければ undefined、書いている間は null）。practise はその文を話す練習を開く
export type Voice = { say: (text: string) => void; sayWithSymbols: (text: string) => void; symbols: (text: string) => string | null | undefined; practise: (sample: string, pron?: string) => void }

// 読み上げボタン：押すとその文を読む
export const speaker = (t: Elements[keyof Elements], key: string, press: () => void, toRight?: boolean) => glyph(t, key, '🔊', '読み上げる', press, toRight)

// 読み上げと話す練習の対
export const speakerAndMicrophone = (t: Elements[keyof Elements], isTerminal: boolean, keys: { speak: string; practise: string }, say: () => void, practise: () => void) =>
  glyphs(t, isTerminal, [speaker(t, keys.speak, say), glyph(t, keys.practise, '🎤', '話す練習', practise)])

// 読み上げた文の発音記号を薄く。書いている間は一言、頼んでいなければ何も出さない
export const symbolLine = (t: Elements[keyof Elements], symbol: string | null | undefined) => {
  const { Text } = t
  return symbol === undefined ? undefined : <Text dimColor>{symbol ?? '発音記号を書いています…'}</Text>
}
