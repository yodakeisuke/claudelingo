import type { Elements } from 'claude-code'

import type { Practice } from '../../../engine-protocol'
import type { PromptTranslations } from '../../../logic/prompt-translation/prompt-translation'

// コーチの返事：書き起こし（違う語は ** で囲む）とアドバイス、頼んでいる間の一言、失敗の理由
export type Coached = NonNullable<ReturnType<typeof PromptTranslations.line>> | string | undefined
// 帯のボタンの手：声で入れた文を聞かせる、お手本を読む、入れ直す
type Hands = { hear: (heard: string) => void; say: () => void; again: () => void }

// 入力欄の上に、話す練習。お手本（と発音記号）、声で入れる欄、コーチの返事。違う語は赤い下線
// 右端の 4 マスは、帯の折りたたみ印 [-] に重ならないよう空ける
export const practiceBand = (t: Elements[keyof Elements], practice: Practice, coached: Coached, hands: Hands) => {
  const { Box, Button, Markdown, Text } = t
  // 入力欄を描けない面（モバイル）では、お手本とコーチの返事だけ
  const Input = 'Input' in t ? t.Input : undefined
  return (
    <Box flexDirection="column" paddingRight={4}>
      <Box gap={1}><Text dimColor bold>お手本</Text><Text>{practice.sample}</Text>{practice.pron && <Text dimColor>{practice.pron}</Text>}</Box>
      {Input && <Input key="practice" label="練習" placeholder="声で入れて Enter（Claude には送られません）" value={practice.heard ?? ''} autoFocus onSubmit={hands.hear} />}
      {typeof coached === 'string' && <Text dimColor>{coached}</Text>}
      {typeof coached === 'object' && (
        <Box flexDirection="column">
          <Box gap={1}>
            <Text dimColor bold>聞き取り</Text>
            <Text>{coached.restated.split('**').map((part, i) => (i % 2 ? <Text color="error" underline>{part}</Text> : <Text>{part}</Text>))}</Text>
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
