import type { Elements } from 'claude-code'

import type { Practice } from '../../../engine-protocol'
import { PromptTranslations } from '../../../logic/prompt-translation/prompt-translation'
import type { SpeakingPractice } from '../../../logic/speaking-practice/speaking-practice'

type Coached = ReturnType<typeof SpeakingPractice.shown>
// 帯の手：欄の文を残す、声で入れた文を聞かせる、お手本を読む、入れ直す
type Hands = { keep: (text: string) => void; hear: (heard: string) => void; say: () => void; again: () => void }

// 入力欄の上に、話す練習。お手本（と発音記号）、声で入れる欄、コーチの返事。違う語は赤い下線
// 右端の 4 マスは、帯の折りたたみ印 [-] に重ならないよう空ける。端末では帯が開いても打鍵は入力欄に残るので、欄へ移る鍵を添える
export const practiceBand = (t: Elements[Exclude<keyof Elements, 'mobile'>], isTerminal: boolean, practice: Practice, coached: Coached, hands: Hands) => {
  const { Box, Button, Input, Markdown, Text } = t
  return (
    <Box flexDirection="column" paddingRight={4}>
      <Box gap={1}><Text dimColor bold>お手本</Text><Text>{practice.sample}</Text>{practice.pron && <Text dimColor italic>{practice.pron}</Text>}</Box>
      <Input key="practice" label="練習" placeholder={`${isTerminal ? 'ctrl+x tab で欄へ移り、' : ''}声で入れて Enter（Claude には送られません）`} value={practice.heard ?? ''} autoFocus onInput={hands.keep} onSubmit={hands.hear} />
      {typeof coached === 'string' && <Text dimColor>{coached}</Text>}
      {typeof coached === 'object' && (
        <Box flexDirection="column">
          <Box gap={1}>
            <Text dimColor bold>聞き取り</Text>
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
