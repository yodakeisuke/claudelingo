import type { Elements } from 'claude-code'

// 読ませる手と、読ませた文の発音記号（頼んでいなければ undefined、書いている間は null）。practise はその文を話す練習を開く
export type Voice = { say: (text: string) => void; sayWithSymbols: (text: string) => void; symbols: (text: string) => string | null | undefined; practise: (sample: string, pron?: string) => void }

// 飾りのない絵文字一字のボタン。何が起こるかはホバーで上に小さく出す（右端で見切れないよう左へ伸ばす）
const glyph = (t: Elements[keyof Elements], key: string, label: string, tip: string, press: () => void) => {
  const { Box, Button, Text } = t
  return (
    <Box key={`${key}-tip`}>
      <Button key={key} label={label} plain dimColor onPress={press} />
      <Box position="absolute" top={-1} right={0} display="none" hover={{ display: 'flex' }}><Text inverse>{` ${tip} `}</Text></Box>
    </Box>
  )
}

// 読み上げボタン：押すとその文を読む
export const speaker = (t: Elements[keyof Elements], key: string, press: () => void) => glyph(t, key, '🔊', '読み上げる', press)

// 読み上げと話す練習の対。端末以外（Svg を持つ面）はボタンが自前の余白を持つので、間を詰めて文との間隔に揃える
export const speakerAndMicrophone = (t: Elements[keyof Elements], keys: { speak: string; practise: string }, say: () => void, practise: () => void) => {
  const { Box } = t
  return <Box gap={'Svg' in t ? 0 : 1}>{speaker(t, keys.speak, say)}{glyph(t, keys.practise, '🎤', '話す練習', practise)}</Box>
}

// 読み上げた文の発音記号を薄く。書いている間は一言、頼んでいなければ何も出さない
export const symbolLine = (t: Elements[keyof Elements], symbol: string | null | undefined) => {
  const { Text } = t
  return symbol === undefined ? undefined : <Text dimColor>{symbol ?? '発音記号を書いています…'}</Text>
}
