import type { Elements } from 'claude-code'

import type { Practice } from '../../../engine-protocol'
import { glyph } from '../glyph/glyph'
import { PromptTranslations } from '../../../logic/prompt-translation/prompt-translation'
import type { SpeakingPractice } from '../../../logic/speaking-practice/speaking-practice'

// 声は手元の音声入力で欄に入れる（mods にマイクはない）。? のホバーと押下で出す
export const VOICE_HELP = '手元の音声入力（Mac 標準は fn 2回）でお手本を話して Enter。言語は練習する言語に。Claude には送られません'

type Coached = ReturnType<typeof SpeakingPractice.shown>
// 帯の手：欄の文を残す、声で入れた文を聞かせる、お手本を読む、入れ直す、声の入れ方を出す、閉じる
type Hands = { keep: (text: string) => void; hear: (heard: string) => void; say: () => void; again: () => void; help: () => void; close: () => void }

// 入力欄の上に、話す練習。お手本（と発音記号）、声で入れる欄、コーチの返事。違う語は赤い下線。見出しは同じ幅で中身の頭を揃える
// 右端の 4 マスは帯の折りたたみ印 [-] 避け。端末は帯が開いても打鍵が入力欄に残るので欄へ移る鍵を添え、行は詰める（Desktop は 1 行空ける）
export const practiceBand = (t: Elements[Exclude<keyof Elements, 'mobile'>], isTerminal: boolean, practice: Practice, coached: Coached, hands: Hands) => {
  const { Box, Button, Input, Markdown, Text } = t
  const head = (text: string) => <Box width={8} flexShrink={0}><Text dimColor bold>{text}</Text></Box>
  return (
    <Box flexDirection="column" gap={isTerminal ? 0 : 1} paddingRight={4}>
      <Box justifyContent="space-between">
        <Box gap={1}>{head('お手本')}<Text>{practice.sample}</Text>{practice.pron && <Text dimColor italic>{practice.pron}</Text>}</Box>
        <Button key="practice-close" label="✕" plain dimColor role="dismiss" onPress={hands.close} />
      </Box>
      <Box gap={1}>
        {head('練習')}
        <Input key="practice" placeholder={`${isTerminal ? 'ctrl+x tab で欄へ移り、' : ''}声で入れて Enter`} value={practice.heard ?? ''} autoFocus onInput={hands.keep} onSubmit={hands.hear} />
        {glyph(t, 'practice-help', '?', VOICE_HELP, hands.help)}
      </Box>
      {typeof coached === 'string' && <Text dimColor>{coached}</Text>}
      {typeof coached === 'object' && (
        <Box flexDirection="column">
          <Box gap={1}>
            {head('聞き取り')}
            <Text>{PromptTranslations.parts(coached.restated).map((part, i) => (i % 2 ? <Text color="error" underline>{part}</Text> : <Text>{part}</Text>))}</Text>
          </Box>
          {coached.tips.map(tip => <Markdown dimColor text={`💡 ${tip}`} />)}
        </Box>
      )}
      <Box gap={1}>
        <Button key="practice-speak" label="🔊 お手本" onPress={hands.say} />
        <Button key="practice-again" label="もう一度" onPress={hands.again} />
      </Box>
    </Box>
  )
}
