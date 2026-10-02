import { describe, expect, test } from 'claude-code/testing'

import { DraftTranslations } from '../../logic/draft-translation/draft-translation'

const on = { enabled: true, native: 'Japanese', target: 'English', model: 'sonnet' }

describe('draft-translation', () => {
  test('打ちかけを訳すのは、オンで、空でなく、コマンドの途中でもないとき', () => {
    // [オン, 打ちかけ, 訳すか]
    const rows = [
      [true, 'テストを', true],
      [false, 'テストを', false],
      [true, '  ', false],
      [true, '/', false],
      [true, '/cl', false],
      [true, '/clear', false],
      [true, '/tmp を見て', true],
    ] as const
    for (const [enabled, draft, wanted] of rows) {
      expect(DraftTranslations.request({ ...on, enabled }, draft, ['clear']) !== undefined).toBe(wanted)
    }
  })

  test('頼み方もモデルも送信後と同じ', () => {
    const request = DraftTranslations.request(on, 'テストを ', [])
    expect(request?.model).toBe('sonnet')
    expect(request?.prompt).toBe('<message>テストを</message>')
  })
})
