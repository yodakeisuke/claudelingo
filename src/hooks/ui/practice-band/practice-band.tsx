import type { Elements } from 'claude-code'

import type { Practice } from '../../../engine-protocol'
import type { Wording } from '../../../locales/en'
import { Restatements } from '../../../logic/restatement/restatement'
import type { SpeakingPractice } from '../../../logic/speaking-practice/speaking-practice'
import { glyph } from '../glyph/glyph'

type Coached = ReturnType<typeof SpeakingPractice.shown>
// 帯の手：欄の文を残す、声で入れた文を聞かせる、お手本を読む、入れ直す、案内を出す、閉じる
type Hands = { keep: (text: string) => void; hear: (heard: string) => void; say: () => void; again: () => void; help: (text: string) => void; close: () => void }

// 入力欄の上に、話す練習。お手本（と発音記号）、声で入れる欄、コーチの返事。違う語は赤い下線。見出しは同じ幅で中身の頭を揃える
// 端末の右端 4 マスは帯の折りたたみ印 [-] 避け（Desktop に印はない）。端末は帯が開いても打鍵が入力欄に残るので欄へ移る鍵を添え、行は詰める（Desktop は 1 行空ける）
export const practiceBand = (t: Elements[Exclude<keyof Elements, 'mobile'>], w: Wording, isTerminal: boolean, practice: Practice, coached: Coached, hands: Hands) => {
  const { Box, Button, Input, Markdown, Text } = t
  const head = (text: string) => <Box width={8} flexShrink={0}><Text dimColor bold>{text}</Text></Box>
  return (
    <Box flexDirection="column" gap={isTerminal ? 0 : 1} paddingRight={isTerminal ? 4 : 0}>
      <Box justifyContent="space-between">
        <Box gap={1}>{head(w.sample)}<Text>{practice.sample}</Text>{practice.pron && <Text dimColor italic>{practice.pron}</Text>}</Box>
        <Button key="practice-close" label="✕" plain dimColor role="dismiss" onPress={hands.close} />
      </Box>
      <Box gap={1}>
        {head(w.attempt)}
        <Input key="practice" placeholder={`${isTerminal ? w.toField : ''}${w.speakAndEnter}`} value={practice.heard ?? ''} autoFocus onInput={hands.keep} onSubmit={hands.hear} />
        {/* 声は手元の音声入力で欄に入れる（mods にマイクはない）。その案内は ? のホバーと押下で出す */}
        {glyph(t, 'practice-help', '?', w.voiceHelp, () => hands.help(w.voiceHelp))}
      </Box>
      {typeof coached === 'string' && <Text dimColor>{coached}</Text>}
      {typeof coached === 'object' && (
        <Box flexDirection="column">
          <Box gap={1}>
            {head(w.heard)}
            <Text>{Restatements.parts(coached.restated).map((part, i) => (i % 2 ? <Text color="error" underline>{part}</Text> : <Text>{part}</Text>))}</Text>
          </Box>
          {coached.tips.map(tip => <Markdown dimColor text={`💡 ${tip}`} />)}
        </Box>
      )}
      <Box gap={1}>
        <Button key="practice-speak" label={`🔊 ${w.sample}`} onPress={hands.say} />
        <Button key="practice-again" label={w.again} onPress={hands.again} />
      </Box>
    </Box>
  )
}
