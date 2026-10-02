import { describe, expect, test } from 'claude-code/testing'

import { Result } from '../../logic/result/result'

const toData = (value: unknown): object => ({ ok: true, value })
const toError = (error: unknown): object => ({ ok: false, error })

describe('result', () => {
  test('and は成功のときだけ、mapError は失敗のときだけ働く', () => {
    expect(Result.given(' a ').and(s => s.trim()).mapError(() => 'x').either(toData, toError)).toEqual({ ok: true, value: 'a' })
    expect(Result.fail('e').and(() => 1).mapError(e => `${e}2`).either(toData, toError)).toEqual({ ok: false, error: 'e2' })
  })

  test('and の関数が Result を返せば、平らにつなぐ', () => {
    expect(Result.given(1).and(() => Result.fail('no')).either(toData, toError)).toEqual({ ok: false, error: 'no' })
    expect(Result.given(1).and(n => Result.given(n + 1)).either(toData, toError)).toEqual({ ok: true, value: 2 })
  })

  test('also は成功のときだけ副作用を走らせ、値は変えない', () => {
    const seen: number[] = []
    expect(Result.given(1).also(n => seen.push(n)).either(toData, toError)).toEqual({ ok: true, value: 1 })
    Result.fail('e').also(() => seen.push(9))
    expect(seen).toEqual([1])
  })

  test('either は成功と失敗で分けて鎖を抜ける', () => {
    expect(Result.given(2).either(n => n * 10, () => 0)).toBe(20)
    expect(Result.fail('e').either(() => '', e => `${e}!`)).toBe('e!')
  })
})
