import { describe, expect, test } from 'claude-code/testing'

import { DraftSuggestions } from '../../logic/draft-suggestion/draft-suggestion'

const on = { enabled: true, native: 'Japanese', target: 'English' }

describe('draft-suggestion', () => {
  test('打ちかけを見せるのは、オンで、空でなく、コマンドの途中でもないとき', () => {
    // [オン, 打ちかけ, 見せるか]
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
      expect(DraftSuggestions.request({ ...on, enabled }, draft, ['clear']) !== undefined).toBe(wanted)
    }
  })

  test('依頼は haiku に、打ちかけをそのまま渡す', () => {
    const request = DraftSuggestions.request(on, 'テストを ', [])
    expect(request?.model).toBe('haiku')
    expect(request?.prompt).toBe('<draft>テストを</draft>')
  })

  test('→ の行が続き、残りが言い直し', () => {
    expect(DraftSuggestions.band({ ok: true, value: 'Write **the** tests\n→ and run them.' })).toEqual({ restated: 'Write **the** tests', next: 'and run them.' })
    expect(DraftSuggestions.band({ ok: true, value: 'Write tests' })).toEqual({ restated: 'Write tests', next: '' })
    expect(DraftSuggestions.band({ ok: false, error: 'api-error' })).toEqual({ restated: '訳せませんでした：api-error', next: '' })
  })
})
