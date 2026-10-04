import { en } from '../../locales/en'
import { ja } from '../../locales/ja'

// --- public interface
export const LingoSettings = {
  of: (saved: unknown): Settings => of(saved),
  wording: (native: string) => wording(native),
  models: () => models(),
  entered: (field: keyof Settings, text: string, now: string) => entered(field, text, now),
  pause: (text: string, now: string) => pause(text, now),
  step: (now: string, by: 1 | -1) => step(now, by),
}

// --- I/O
type Settings = { enabled: boolean; native: string; target: string; level: string; model: string; afterSend: boolean; live: boolean; liveModel: string; livePause: string; card: boolean; cardModel: string; voice: string }

// --- business rules
// 言語設定は、保存された値を初期値（有効、日本語→英語、レベルは空欄、基本のモデルは sonnet。送った後の訳も有効。入力中の校正も有効、sonnet、0.5 秒。単語の絵も有効、sonnet。読み上げの声は Samantha）に重ねたもの
const of = (saved: unknown): Settings => ({ enabled: true, native: 'Japanese', target: 'English', level: '', model: 'sonnet', afterSend: true, live: true, liveModel: 'haiku', livePause: '1.5', card: true, cardModel: 'opus', voice: 'Samantha', ...(saved as Partial<Settings> | undefined) })
// 翻訳モデルは別名で選ぶ。別名は常にその系統の最新を指す
const models = () => ['haiku', 'sonnet', 'opus']
// 母語・学ぶ言語は、空（空白だけ）で確定しても今のまま。レベルと声は空にも意味がある（伝えない・既定の声）
const entered = (field: keyof Settings, text: string, now: string) => (['native', 'target'].includes(field) && !text.trim() ? now : text)
// 入力中の校正は、打つ手がこの秒数止まったら頼む。全角も読み、0.1 秒刻みで 0.3〜2 秒に収め、数で始まらなければ今のまま
const pause = (text: string, now: string) => {
  const seconds = Math.round(parseFloat(text.normalize('NFKC')) * 10) / 10
  return Number.isNaN(seconds) ? now : String(Math.min(2, Math.max(0.3, seconds)))
}
// -/+ は 0.1 秒ずつ動かす
const step = (now: string, by: 1 | -1) => pause(String(Number(now) + by / 10), now)
// UI の文言は母語の辞書で出す。母語は自由に書けるので、辞書の言語の呼び名を含めばその辞書（「日本語（関西弁）」も）、含まなければ英語
const wording = (native: string) => (/japanese|日本語/i.test(native) ? ja : en)
