// 公開する操作
export const LanguageSettings = {
  of: (options: Options) => of(options),
  models: () => models(),
}

// データ構造
type Options = Readonly<Record<string, unknown>>
type Settings = { enabled: boolean; native: string; target: string; model: string }

// ビジネスルール
// 言語設定は userConfig の値そのもの。初期値は plugin.json が持つ
const of = (options: Options): Settings => ({
  enabled: options.enabled === true,
  native: String(options.native),
  target: String(options.target),
  model: String(options.model),
})
// 翻訳モデルは別名で選ぶ。別名は常にその系統の最新を指す
const models = () => ['haiku', 'sonnet', 'opus']
