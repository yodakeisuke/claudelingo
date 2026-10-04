import type { Elements } from 'claude-code'

import type { Wording } from '../../../locales/en'

import { glyph, glyphs } from '../glyph/glyph'

// 読ませる手と、読ませた文の発音記号（頼んでいなければ undefined、書いている間は null）。practise はその文を話す練習を開く
export type Voice = { say: (text: string) => void; sayWithSymbols: (text: string) => void; symbols: (text: string) => string | null | undefined; practise: (sample: string, pron?: string) => void }

// 読み上げボタン：押すとその文を読む
export const speaker = (t: Elements[keyof Elements], w: Wording, key: string, press: () => void, toRight?: boolean) => glyph(t, key, '🔊', w.speak, press, toRight)

// 読み上げと話す練習の対
export const speakerAndMicrophone = (t: Elements[keyof Elements], w: Wording, isTerminal: boolean, keys: { speak: string; practise: string }, say: () => void, practise: () => void) =>
  glyphs(t, isTerminal, [speaker(t, w, keys.speak, say), glyph(t, keys.practise, '🎤', w.practise, practise)])

// 読み上げた文の発音記号を薄い斜体で（本文と見分ける）。書いている間は一言、頼んでいなければ何も出さない
export const symbolLine = (t: Elements[keyof Elements], w: Wording, symbol: string | null | undefined) => {
  const { Text } = t
  return symbol === undefined ? undefined : <Text dimColor italic>{symbol ?? w.writingSymbols}</Text>
}
