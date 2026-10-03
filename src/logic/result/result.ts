import type { Result as Data } from '../../engine-protocol'

// --- public interface
export const Result = {
  given: <T>(value: T) => given(value),
  fail: <E>(error: E) => fail(error),
}

// --- I/O
// 鎖でつなげる Result。and は成功を、or は失敗を受けて進む。either で分けて鎖を抜ける
type Fluent<T, E> = {
  and: <U, F = never>(fn: (value: T) => U | Fluent<U, F>) => Fluent<U, E | F>
  or: <F, U = never>(fn: (error: E) => F | Fluent<U, F>) => Fluent<T | U, F>
  either: <R>(onOk: (value: T) => R, onError: (error: E) => R) => R
}
// Promise を渡したら、決着した Result の Promise。データの Result を渡したら、そのまま鎖に
type Given<T> = T extends Promise<infer U> ? Promise<Fluent<U, string>> : [T] extends [Data<unknown, unknown>] ? Fluent<Extract<T, { ok: true }>['value'], Extract<T, { ok: false }>['error']> : Fluent<T, never>

// --- business rules
// and は成功のときだけ、or は失敗のときだけ通す。戻りが Result ならそのままつなぎ、普通の値なら and は成功に、or は失敗に包む。either で鎖を抜ける
const wrap = <T, E>(data: Data<T, E>): Fluent<T, E> => ({
  and: <U, F>(fn: (value: T) => U | Fluent<U, F>) => (data.ok ? lift<U, E | F>(fn(data.value), succeed) : wrap<U, E | F>(data)),
  or: <F, U>(fn: (error: E) => F | Fluent<U, F>) => (data.ok ? wrap<T | U, F>(data) : lift<T | U, F>(fn(data.error), fail)),
  either: (onOk, onError) => (data.ok ? onOk(data.value) : onError(data.error)),
})
// 値は成功に包む。データの Result はそのまま鎖に。Promise は決着を待って包み、拒まれたらその message で失敗
const given = <T>(value: T) =>
  (value instanceof Promise
    ? value.then(succeed, (error: unknown) => Result.fail(error instanceof Error ? error.message : String(error)))
    : isData(value) ? wrap(value) : succeed(value)) as Given<T>
// データの Result（{ ok, value } か { ok, error }）かどうか
const isData = (value: unknown): value is Data<unknown, unknown> => typeof value === 'object' && value !== null && 'ok' in value && ('value' in value || 'error' in value)
// 成功の Result
const succeed = <T>(value: T) => wrap<T, never>({ ok: true, value })
// 失敗の Result
const fail = <E>(error: E) => wrap<never, E>({ ok: false, error })
// 関数の戻りが Result ならそのまま、普通の値なら plain で包む
const lift = <U, F>(returned: unknown, plain: (value: unknown) => unknown) => (isFluent(returned) ? returned : plain(returned)) as Fluent<U, F>
// 鎖でつなげる Result かどうか
const isFluent = (value: unknown) => typeof value === 'object' && value !== null && 'and' in value && 'either' in value
