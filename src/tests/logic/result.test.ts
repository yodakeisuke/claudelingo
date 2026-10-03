import { describe, expect, test } from 'claude-code/testing'

import { Result } from '../../logic/result/result'

// either で鎖を抜けて、比べられるデータに戻す
type Data = { ok: boolean; value?: unknown; error?: unknown }
const ok = (value: unknown): Data => ({ ok: true, value })
const error = (error: unknown): Data => ({ ok: false, error })

describe('result', () => {
  test('and は成功のときだけ働く', () => {
    expect(Result.given(' a ').and(s => s.trim()).either(ok, error)).toEqual({ ok: true, value: 'a' })
    expect(Result.fail('e').and(() => 1).either(ok, error)).toEqual({ ok: false, error: 'e' })
  })

  test('and の関数が Result を返せば、平らにつなぐ', () => {
    expect(Result.given(1).and(() => Result.fail('no')).either(ok, error)).toEqual({ ok: false, error: 'no' })
    expect(Result.given(1).and(n => Result.given(n + 1)).either(ok, error)).toEqual({ ok: true, value: 2 })
  })

  test('or は失敗のときだけ働く。普通の値は失敗に包み、Result を返せば平らにつなぐ', () => {
    expect(Result.fail('e').or(e => `${e}!`).either(ok, error)).toEqual({ ok: false, error: 'e!' })
    expect(Result.given(1).or(() => 'x').either(ok, error)).toEqual({ ok: true, value: 1 })
    expect(Result.fail('e').or(() => Result.given(0)).either(ok, error)).toEqual({ ok: true, value: 0 })
  })

  test('given にデータの Result を渡すと、そのまま鎖に乗る', () => {
    expect(Result.given({ ok: true, value: 1 } as const).and(n => n + 1).either(ok, error)).toEqual({ ok: true, value: 2 })
    expect(Result.given({ ok: false, error: 'e' } as const).and(() => 1).either(ok, error)).toEqual({ ok: false, error: 'e' })
  })

  test('either は成功と失敗で分けて鎖を抜ける', () => {
    expect(Result.given(2).either(n => n * 10, () => 0)).toBe(20)
    expect(Result.fail('e').either(() => '', e => `${e}!`)).toBe('e!')
  })

  test('given に Promise を渡すと、決着を待って包む。拒まれたら、その message で失敗', async () => {
    expect((await Result.given(Promise.resolve(1))).either(ok, error)).toEqual({ ok: true, value: 1 })
    expect((await Result.given(Promise.reject(new Error('no')))).either(ok, error)).toEqual({ ok: false, error: 'no' })
  })
})
