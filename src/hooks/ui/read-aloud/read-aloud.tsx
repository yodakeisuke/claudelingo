import type { Elements } from 'claude-code'

// 読ませる手と、読ませた文の発音記号（頼んでいなければ undefined、書いている間は null）。practise はその文を話す練習を開く
export type Voice = { say: (text: string) => void; sayWithSymbols: (text: string) => void; symbols: (text: string) => string | null | undefined; practise: (sample: string, pron?: string) => void }

// 読み上げボタン：飾りのない 🔊 一字。押すとその文を読む
export const speaker = (t: Elements[keyof Elements], key: string, press: () => void) => {
  const { Button } = t
  return <Button key={key} label="🔊" plain dimColor onPress={press} />
}

// 話す練習のボタン：🔊 と同じく飾りのない 🎤 一字。押すとその文の練習が入力欄の上に開く
export const microphone = (t: Elements[keyof Elements], key: string, press: () => void) => {
  const { Button } = t
  return <Button key={key} label="🎤" plain dimColor onPress={press} />
}

// 読み上げた文の発音記号を薄く。書いている間は一言、頼んでいなければ何も出さない
export const symbolLine = (t: Elements[keyof Elements], symbol: string | null | undefined) => {
  const { Text } = t
  return symbol === undefined ? undefined : <Text dimColor>{symbol ?? '発音記号を書いています…'}</Text>
}
