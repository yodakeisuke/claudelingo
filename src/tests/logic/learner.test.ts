import { describe, expect, test } from 'claude-code/testing'

import { TranslationRequest } from '../../logic/prompt-translation/translation-request'

const learner = { native: 'Japanese', target: 'English', level: '' }

describe('learner', () => {
  test('頼み事は学ぶ人を伝え（単語の絵は illustrate-nuance の文面のままにするので伝えない）、レベルは書いてあるときだけ自己申告として添える', () => {
    // [レベル, 伝える文]
    const rows = [
      ['', 'The learner is a Japanese speaker learning English.\n\n'],
      ['TOEIC 850', 'The learner is a Japanese speaker learning English.\nSelf-described English level: "TOEIC 850". Calibrate everything you produce to it.\n\n'],
    ] as const
    for (const [level, told] of rows) {
      expect(TranslationRequest.of({ ...learner, level, model: 'haiku' }, 'ログ見て').system.startsWith(told)).toBe(true)
    }
  })
})
