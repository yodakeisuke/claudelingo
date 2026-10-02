// 公開する操作
export const TranslationSettings = {
  of: (saved: unknown) => of(saved),
  models: () => models(),
  pauses: () => pauses(),
}

// データ構造
type Settings = { enabled: boolean; native: string; target: string; model: string; live: boolean; liveModel: string; livePause: string; card: boolean; cardModel: string }

// ビジネスルール
// 言語設定は、保存された値を初期値（有効、日本語→英語、sonnet。入力中の校正も有効、sonnet、0.5 秒。単語の絵も有効、sonnet）に重ねたもの
// 空欄で確定された言語は、初期値のまま
const of = (saved: unknown): Settings => ({ enabled: true, native: 'Japanese', target: 'English', model: 'sonnet', live: true, liveModel: 'sonnet', livePause: '0.5', card: true, cardModel: 'sonnet', ...Object.fromEntries(Object.entries(saved ?? {}).filter(([, v]) => v !== '')) })
// 翻訳モデルは別名で選ぶ。別名は常にその系統の最新を指す
const models = () => ['haiku', 'sonnet', 'opus']
// 入力中の校正は、打つ手がこの秒数止まったら頼む
const pauses = () => ['0.3', '0.5', '1', '2']
