import type { Result as Of } from '../../types'

// 公開する操作
export const Result = {
  succeed: <T>(value: T): Of<T, never> => ({ ok: true, value }),
  fail: <E>(error: E): Of<never, E> => ({ ok: false, error }),
  map: <T, U>(fn: (value: T) => U) => <E>(result: Of<T, E>) => map(result, fn),
}

// データ構造

// ビジネスルール
// 成功のときだけ値を変え、失敗はそのまま通す
const map = <T, U, E>(result: Of<T, E>, fn: (value: T) => U): Of<U, E> =>
  result.ok ? { ok: true, value: fn(result.value) } : result
