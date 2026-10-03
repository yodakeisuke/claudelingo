// --- public interface
export const TranslationSettings = {
  of: (saved: unknown): Settings => of(saved),
  models: () => models(),
  pause: (text: string, now: string) => pause(text, now),
  step: (now: string, by: 1 | -1) => step(now, by),
}

// --- I/O
type Settings = { enabled: boolean; native: string; target: string; model: string; afterSend: boolean; live: boolean; liveModel: string; livePause: string; card: boolean; cardModel: string }

// --- business rules
// 言語設定は、保存された値を初期値（有効、日本語→英語。送った後の訳も有効、sonnet。入力中の校正も有効、sonnet、0.5 秒。単語の絵も有効、sonnet）に重ねたもの
const of = (saved: unknown): Settings => ({ enabled: true, native: 'Japanese', target: 'English', model: 'sonnet', afterSend: true, live: true, liveModel: 'sonnet', livePause: '0.5', card: true, cardModel: 'sonnet', ...(saved as Partial<Settings> | undefined) })
// 翻訳モデルは別名で選ぶ。別名は常にその系統の最新を指す
const models = () => ['haiku', 'sonnet', 'opus']
// 入力中の校正は、打つ手がこの秒数止まったら頼む。0.1 秒刻みで 0.3〜2 秒に収め、数でなければ今のまま
const pause = (text: string, now: string) => {
  const seconds = Math.round(Number(text) * 10) / 10
  return Number.isNaN(seconds) ? now : String(Math.min(2, Math.max(0.3, seconds)))
}
// -/+ は 0.1 秒ずつ動かす
const step = (now: string, by: 1 | -1) => pause(String(Number(now) + by / 10), now)
