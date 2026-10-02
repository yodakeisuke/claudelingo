import { describe, expect, test } from 'claude-code/testing'

import { ForeignVersions } from '../../logic/foreign-version/foreign-version'

const on = { enabled: true, native: 'Japanese', target: 'English', model: 'haiku' }

describe('foreign-version', () => {
  test('外国語版を作るのは、オンのときに自分で打った指示だけ', () => {
    // [オン, 送り元, 文面, 作るか]
    const rows = [
      [true, 'composer', 'ログ見て', true],
      [false, 'composer', 'ログ見て', false],
      [true, 'sdk', 'ログ見て', true],
      [true, 'bridge', 'ログ見て', true],
      [true, 'task-notification', 'ログ見て', false],
      [true, 'peer', 'ログ見て', false],
      [true, 'composer', '', false],
      [true, 'composer', '/clear', false],
    ] as const
    for (const [enabled, from, text, wanted] of rows) {
      expect(ForeignVersions.isWanted({ ...on, enabled }, from, text)).toBe(wanted)
    }
  })

  test('返事が来れば訳文、来なければその失敗をそのまま持つ', () => {
    expect(ForeignVersions.of({ isAnswered: true, text: ' Check the logs. \n' })).toEqual({ ok: true, value: 'Check the logs.' })
    const failure = { isAnswered: false, reason: 'empty-reply' } as const
    expect(ForeignVersions.of(failure)).toEqual({ ok: false, error: failure })
  })

  test('呼び出し自体が拒まれたら、その message を持つ', () => {
    expect(ForeignVersions.failed(new Error('model blocked'))).toEqual({ ok: false, error: { message: 'model blocked' } })
  })
})
