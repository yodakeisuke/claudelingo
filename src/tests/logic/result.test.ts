import { describe, expect, test } from 'claude-code/testing'

import { Result } from '../../logic/result/result'

describe('result', () => {
  test('and は成功のときだけ、mapError は失敗のときだけ働く', () => {
    expect(Result.ok(' a ').and(s => s.trim()).mapError(() => 'x').data).toEqual({ ok: true, value: 'a' })
    expect(Result.fail('e').and(() => 1).mapError(e => `${e}2`).data).toEqual({ ok: false, error: 'e2' })
  })

  test('and の関数が Result を返せば、平らにつなぐ', () => {
    expect(Result.ok(1).and(() => Result.fail('no')).data).toEqual({ ok: false, error: 'no' })
    expect(Result.ok(1).and(n => Result.ok(n + 1)).data).toEqual({ ok: true, value: 2 })
  })
})
