import { describe, expect, test } from 'claude-code/testing'

import { Result } from '../../logic/result/result'

describe('result', () => {
  test('map・flatMap は成功のときだけ、mapError は失敗のときだけ働く', () => {
    const ok = Result.ok(' a ').map(s => s.trim()).flatMap(s => Result.ok(`${s}!`)).mapError(() => 'x')
    expect(ok.data).toEqual({ ok: true, value: 'a!' })
    const failed = Result.fail('e').map(() => 1).flatMap(() => Result.ok(2)).mapError(e => `${e}2`)
    expect(failed.data).toEqual({ ok: false, error: 'e2' })
    expect(Result.ok(1).flatMap(() => Result.fail('no')).data).toEqual({ ok: false, error: 'no' })
  })

  test('let は成否を問わず全体を渡す', () => {
    expect(Result.ok(1).let(r => r.ok)).toBe(true)
    expect(Result.fail('e').let(r => r.ok)).toBe(false)
  })
})
