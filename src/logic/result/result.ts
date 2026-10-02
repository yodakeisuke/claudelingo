import type { Result as Data } from '../../types'

// 公開する操作
export const Result = {
  given: <T>(value: T) => wrap<T, never>({ ok: true, value }),
  fail: <E>(error: E) => wrap<never, E>({ ok: false, error }),
}

// データ構造
// 鎖でつなげる Result。either で鎖を抜ける
type Fluent<T, E> = {
  and: <U, F = never>(fn: (value: T) => U | Fluent<U, F>) => Fluent<U, E | F>
  either: <R>(onOk: (value: T) => R, onError: (error: E) => R) => R
}

// ビジネスルール
// and は成功のときだけ通す。戻りが Result ならそのままつなぎ、普通の値なら成功に包む。either は成功か失敗かで分けて鎖を抜ける
const wrap = <T, E>(data: Data<T, E>): Fluent<T, E> => ({
  and: <U, F>(fn: (value: T) => U | Fluent<U, F>) => (data.ok ? lift(fn(data.value)) : wrap<U, E | F>(data)),
  either: (onOk, onError) => (data.ok ? onOk(data.value) : onError(data.error)),
})
// 関数の戻りが Result ならそのまま、普通の値なら成功に包む
const lift = <U, F>(returned: U | Fluent<U, F>): Fluent<U, F> => (isFluent(returned) ? returned : Result.given(returned)) as Fluent<U, F>
// 鎖でつなげる Result かどうか
const isFluent = (value: unknown) => typeof value === 'object' && value !== null && 'and' in value && 'either' in value
