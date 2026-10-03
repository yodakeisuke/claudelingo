import type { Elements, RenderElement } from 'claude-code'

import type { Aspect, Opened, Shown } from '../../../engine-protocol'
import { WordAspects } from '../../../logic/word-aspect/word-aspect'
import { WordCards } from '../../../logic/word-card/word-card'
import { WordLines } from '../../../logic/word-line/word-line'
import { speaker, speakerAndMicrophone, symbolLine } from '../read-aloud/read-aloud'
import type { Voice } from '../read-aloud/read-aloud'

type Line = ReturnType<typeof WordLines.all>[number]

// 訳の行を、押せる語の並びで（press が無ければ文字で）。飾りのないボタンは灰色の文字に見える（リンクは青になる）。直した語と絵が開いている語は濃く
// 行の頭の字下げとリストの印は Markdown のとおり、表の行はセルを同じ幅の列に並べる（WordLines）。ボタンの key は id-番号（返事では段落ごと、表ではセルごとに id を変える）
export const wordLine = (t: Elements[keyof Elements], isTerminal: boolean, { indent, mark, words, cells }: Line, up: Set<string>, press?: (word: string) => void, id = 'word') => {
  const { Box, Text } = t
  if (cells) return <Box>{cells.map((cell, c) => <Box width={`${Math.floor(100 / cells.length)}%`} paddingRight={1}>{wrapped(t, isTerminal, cell, up, press, `${id}-${c}`)}</Box>)}</Box>
  return <Box paddingLeft={indent}>{wrapped(t, isTerminal, words, up, press, id, mark ? <Box marginRight={1} flexShrink={0}><Text dimColor>{mark}</Text></Box> : undefined)}</Box>
}

// 押せる語を折り返して並べる。記号だけの語（? や —）は押せない文字のまま。語の後ろに空白を挟む。Desktop はボタンの余白のぶん空きすぎるので、右を 1 マス詰める（左を詰めると、折り返した行の頭の語が欠ける）
// 押せないなら 1 つの文として印の横で折り返す（空白の無い日本語の行も印の横に収まる）
const wrapped = (t: Elements[keyof Elements], isTerminal: boolean, words: Line['words'], up: Set<string>, press: ((word: string) => void) | undefined, id: string, lead?: RenderElement) => {
  const { Box, Button, Text } = t
  if (!press) return <Box>{lead}<Text>{words.map((w, i) => <Text bold={w.isFixed}>{i ? ' ' : ''}{w.label}</Text>)}</Text></Box>
  return (
    <Box flexWrap="wrap">
      {lead}
      {words.map((w, i) => (
        <Box marginRight={isTerminal ? 0 : -1}>
          {w.word ? <Button key={`${id}-${i}`} label={w.label} plain dimColor={!w.isFixed && !up.has(w.word)} onPress={() => press(w.word)} /> : <Text dimColor>{w.label}</Text>}
          {i < words.length - 1 && <Text> </Text>}
        </Box>
      ))}
    </Box>
  )
}

const labels: Record<Aspect, string> = { examples: '例文', similar: '類似表現', origin: '語源' }

// 押した語の絵：枠の中に、句（太字）とその発音記号（薄く）、読み上げと話す練習と拡大、動く絵とその横に絵の一文（薄く）。描いている間は同じ大きさの地で場所を取り、押した語で読み上げ・話す練習ができる。描けなければ 1 行
// 絵の下に例文・類似表現・語源のボタン（開いている欄は濃く）。ボタンの key の頭に prefix（返事では段落ごと）。描いている間も押せ、開いた欄はこの順に並ぶ。絵を描けない端末では枠を付けず、絵の代わりに句・記号・一文の 1 行と読み上げ・話す練習
export const wordCard = (t: Elements[keyof Elements], isTerminal: boolean, shown: Shown, resize: (isWide: boolean) => void, open: (aspect: Aspect) => void, voice: Voice, prefix = '') => {
  const { Box, Text, Button } = t
  const { word, card, aspects } = shown
  // 絵なしで届いた絵（端末だけのときに頼んだ）は、端末と同じ 1 行で
  const Svg = !isTerminal && 'Svg' in t && card?.svg !== '' ? t.Svg : undefined
  const status = <Text dimColor>{shown.isFailed ? `描けませんでした：${word}` : `コアイメージを描画中… ${word}`}</Text>
  const unit = card?.unit ?? word
  const voiceButtons = !shown.isFailed && speakerAndMicrophone(t, isTerminal, { speak: `${prefix}speak-${word}`, practise: `${prefix}practise-${word}` }, () => voice.say(unit), () => voice.practise(unit, card?.pron))
  const head = !card ? <Box gap={2} alignItems="center">{status}{voiceButtons}</Box> : Svg ? (
    <Box gap={2} alignItems="center">
      <Text bold>{card.unit}</Text>
      <Text dimColor>{card.pron}</Text>
      {voiceButtons}
      <Button key={`${prefix}resize-${word}`} label={shown.isWide ? '縮小' : '拡大'} dimColor onPress={() => resize(!shown.isWide)} />
    </Box>
  ) : <Box><Text bold>{card.unit}  </Text><Text dimColor>{card.pron}  {card.caption} </Text>{voiceButtons}</Box>
  const picture = Svg && (card ? (
    <Box flexWrap="wrap" alignItems="flex-end" gap={2}>
      <Svg {...WordCards.picture(card.svg, shown.isWide)} alt={card.caption} isInteractive />
      <Text dimColor>{card.caption}</Text>
    </Box>
  ) : !shown.isFailed && <Svg {...WordCards.waiting()} alt={`コアイメージを描画中… ${word}`} />)
  return (
    <Box flexDirection="column" alignItems="flex-start" gap={1} marginTop={1} {...(Svg ? { paddingX: 1, borderStyle: 'round', borderDimColor: true } : {})}>
      {head}
      {picture}
      <Box gap={1} flexWrap="wrap">
        {WordAspects.all().map(a => <Button key={`${prefix}aspect-${word}-${a}`} label={labels[a]} dimColor={!aspects?.[a]} onPress={() => open(a)} />)}
      </Box>
      {WordAspects.all().map(a => aspects?.[a] && aspect(t, labels[a], aspects[a], a === 'examples' ? { voice, key: `${prefix}speak-${word}-ex` } : undefined))}
    </Box>
  )
}

// 開いた欄：見出し（薄い太字）の下に少し空けて、項目の本文と、その下に一段下げて添える行（薄く）。書いている間と失敗は 1 行
// 例文は本文の横に読み上げ。押すと本文の下に発音記号
const aspect = (t: Elements[keyof Elements], label: string, opened: Opened, read?: { voice: Voice; key: string }) => {
  const { Box, Text } = t
  return (
    <Box flexDirection="column" gap={0.5}>
      <Text dimColor bold>{label}</Text>
      <Box flexDirection="column">
        {opened.items?.map((item, i) => (
          <Box flexDirection="column">
            <Box gap={1}><Text>{item.text}</Text>{read && speaker(t, `${read.key}-${i}`, () => read.voice.sayWithSymbols(item.text))}</Box>
            {read && symbolLine(t, read.voice.symbols(item.text))}
            {item.notes.map(note => <Box paddingLeft={2}><Text dimColor>{note}</Text></Box>)}
          </Box>
        )) ?? <Text dimColor>{opened.isFailed ? '書けませんでした' : '書いています…'}</Text>}
      </Box>
    </Box>
  )
}
