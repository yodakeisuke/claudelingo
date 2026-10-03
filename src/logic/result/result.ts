import type { Result as Data } from '../../engine-protocol'

// --- 公開する操作
export const Result = {
  given: <T>(value: T) => given(value),
  fail: <E>(error: E) => wrap<never, E>({ ok: false, error }),
}

// --- データ構造
// 鎖でつなげる Result。either で分けて、data でデータの Result に戻して鎖を抜ける
type Fluent<T, E> = {
  and: <U, F = never>(fn: (value: T) => U | Fluent<U, F>) => Fluent<U, E | F>
  either: <R>(onOk: (value: T) => R, onError: (error: E) => R) => R
  data: () => Data<T, E>
}
// Promise を渡したら、決着した Result の Promise。データの Result を渡したら、そのまま鎖に
type Given<T> = T extends Promise<infer U> ? Promise<Fluent<U, string>> : [T] extends [Data<unknown, unknown>] ? Fluent<Extract<T, { ok: true }>['value'], Extract<T, { ok: false }>['error']> : Fluent<T, never>

// --- ビジネスルール
// and は成功のときだけ通す。戻りが Result ならそのままつなぎ、普通の値なら成功に包む。either と data で鎖を抜ける
const wrap = <T, E>(data: Data<T, E>): Fluent<T, E> => ({
  and: <U, F>(fn: (value: T) => U | Fluent<U, F>) => (data.ok ? lift(fn(data.value)) : wrap<U, E | F>(data)),
  either: (onOk, onError) => (data.ok ? onOk(data.value) : onError(data.error)),
  data: () => data,
})
// 値は成功に包む。データの Result はそのまま鎖に。Promise は決着を待って包み、拒まれたらその message で失敗
const given = <T>(value: T) =>
  (value instanceof Promise
    ? value.then(v => wrap({ ok: true, value: v }), (error: unknown) => Result.fail(error instanceof Error ? error.message : String(error)))
    : wrap(isData(value) ? value : { ok: true, value })) as Given<T>
// データの Result（{ ok, value } か { ok, error }）かどうか
const isData = (value: unknown): value is Data<unknown, unknown> => typeof value === 'object' && value !== null && 'ok' in value && ('value' in value || 'error' in value)
// 関数の戻りが Result ならそのまま、普通の値なら成功に包む
const lift = <U, F>(returned: U | Fluent<U, F>): Fluent<U, F> => (isFluent(returned) ? returned : wrap({ ok: true, value: returned })) as Fluent<U, F>
// 鎖でつなげる Result かどうか
const isFluent = (value: unknown) => typeof value === 'object' && value !== null && 'and' in value && 'either' in value
