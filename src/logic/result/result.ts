import type { Result as Data } from '../../types'

// 公開する操作
export const Result = {
  ok: <T>(value: T) => wrap<T, never>({ ok: true, value }),
  fail: <E>(error: E) => wrap<never, E>({ ok: false, error }),
}

// データ構造
// 鎖でつなげる Result。data は保存できるただのデータで、鎖を抜けるときに使う
type Fluent<T, E> = {
  data: Data<T, E>
  and: <U, F = never>(fn: (value: T) => U | Fluent<U, F>) => Fluent<U, E | F>
  mapError: <F>(fn: (error: E) => F) => Fluent<T, F>
}

// ビジネスルール
// and は成功のときだけ通す。戻りが Result ならそのままつなぎ、普通の値なら成功に包む。mapError は失敗のときだけエラーを変える
const wrap = <T, E>(data: Data<T, E>): Fluent<T, E> => ({
  data,
  and: <U, F>(fn: (value: T) => U | Fluent<U, F>) => (data.ok ? lift(fn(data.value)) : wrap<U, E | F>(data)),
  mapError: fn => wrap(data.ok ? data : { ok: false, error: fn(data.error) }),
})
// 関数の戻りが Result ならそのまま、普通の値なら成功に包む
const lift = <U, F>(returned: U | Fluent<U, F>): Fluent<U, F> => (isFluent(returned) ? returned : Result.ok(returned)) as Fluent<U, F>
// 鎖でつなげる Result かどうか
const isFluent = (value: unknown) => typeof value === 'object' && value !== null && 'and' in value && 'data' in value
