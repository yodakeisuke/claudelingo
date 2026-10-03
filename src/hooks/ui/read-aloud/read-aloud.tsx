import type { Elements } from 'claude-code'

// 読ませる手と、読ませた文の発音記号（頼んでいなければ undefined、書いている間は null）
export type Voice = { say: (text: string) => void; sayWithSymbols: (text: string) => void; symbols: (text: string) => string | null | undefined }

// 読み上げボタン：飾りのない 🔊 一字。押すとその文を読む
export const speaker = (t: Elements[keyof Elements], key: string, press: () => void) => {
  const { Button } = t
  return <Button key={key} label="🔊" plain dimColor onPress={press} />
}

// 読み上げた文の発音記号を薄く。書いている間は一言、頼んでいなければ何も出さない
export const symbolLine = (t: Elements[keyof Elements], symbol: string | null | undefined) => {
  const { Text } = t
  return symbol === undefined ? undefined : <Text dimColor>{symbol ?? '発音記号を書いています…'}</Text>
}
