import { Learner } from '../learner/learner'
import { TranslationRequest } from '../prompt-translation/translation-request'

// --- public interface
export const DraftRequest = {
  of: (settings: Settings, draft: string) => of(settings, draft),
}

// --- I/O
type Settings = Parameters<typeof Learner.context>[0] & { liveModel: string }

// --- business rules
// 送信後の訳と同じ頼み方（入力中の校正のモデル）に、直した所が下書きのどこかを "! " の行で返させる指示を足す（入力欄に赤線を引く）
const of = (settings: Settings, draft: string) => {
  const asked = TranslationRequest.of({ ...settings, model: settings.liveModel }, draft)
  return { ...asked, system: `${asked.system}\n\nFinally, for each mistake in the ${settings.target} parts of the message, in the order they appear, add one line starting with "! " followed by only the wrong word or words, copied exactly from the message (as few words as possible, never the whole sentence). Add none for parts you only translated.` }
}
