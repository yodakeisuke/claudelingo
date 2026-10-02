// 公開する操作
export const Let = {
  of: <T>(value: T) => chain(value),
}

// データ構造
type Chain<T> = { value: T; let: <U>(fn: (value: T) => U) => Chain<U> }

// ビジネスルール
// Kotlin の let：値を関数に通して、また包む
const chain = <T>(value: T): Chain<T> => ({ value, let: fn => chain(fn(value)) })
