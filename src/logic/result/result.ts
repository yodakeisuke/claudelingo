import type { Result as Data } from '../../types'

// 公開する操作
export const Result = {
  ok: <T>(value: T) => wrap<T, never>({ ok: true, value }),
  fail: <E>(error: E) => wrap<never, E>({ ok: false, error }),
}

// データ構造
// 鎖でつなげる Result。data は保存できるただのデータ
type Fluent<T, E> = {
  data: Data<T, E>
  map: <U>(fn: (value: T) => U) => Fluent<U, E>
  flatMap: <U, F>(fn: (value: T) => Fluent<U, F>) => Fluent<U, E | F>
  mapError: <F>(fn: (error: E) => F) => Fluent<T, F>
  let: <R>(fn: (data: Data<T, E>) => R) => R
}

// ビジネスルール
// map・flatMap は成功のときだけ、mapError は失敗のときだけ働き、もう片方はそのまま流す。let は成否を問わず全体を渡す
const wrap = <T, E>(data: Data<T, E>): Fluent<T, E> => ({
  data,
  map: fn => wrap(data.ok ? { ok: true, value: fn(data.value) } : data),
  flatMap: <U, F>(fn: (value: T) => Fluent<U, F>): Fluent<U, E | F> => (data.ok ? fn(data.value) : wrap<U, E | F>(data)),
  mapError: fn => wrap(data.ok ? data : { ok: false, error: fn(data.error) }),
  let: fn => fn(data),
})
