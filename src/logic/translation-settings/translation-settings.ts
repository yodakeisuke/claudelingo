// 公開する操作
export const TranslationSettings = {
  of: (saved: unknown) => of(saved),
  models: () => models(),
}

// データ構造
type Settings = { enabled: boolean; native: string; target: string; model: string }

// ビジネスルール
// 言語設定は、保存された値を初期値（有効、日本語→英語、sonnet）に重ねたもの
const of = (saved: unknown): Settings => ({ enabled: true, native: 'Japanese', target: 'English', model: 'sonnet', ...(saved as Partial<Settings> | undefined) })
// 翻訳モデルは別名で選ぶ。別名は常にその系統の最新を指す
const models = () => ['haiku', 'sonnet', 'opus']
