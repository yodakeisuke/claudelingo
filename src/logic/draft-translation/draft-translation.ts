import type { Translation } from '../../engine-protocol'
import { PromptTranslations } from '../prompt-translation/prompt-translation'
import { TranslationRequest } from '../prompt-translation/translation-request'
import { Result } from '../result/result'

// 公開する操作
export const DraftTranslations = {
  request: (settings: Settings, draft: string, commands: readonly string[]) => request(settings, draft, commands),
  line: (version: Translation) => line(version),
  marks: (draft: string, version: Translation) => marks(draft, version),
  replacement: (draft: string, version: Translation) => replacement(draft, version),
}

// データ構造
type Settings = { enabled: boolean; live: boolean; native: string; target: string; liveModel: string }

// ビジネスルール
// 打ちかけを校正するのは、mod と入力中の校正がオンで、空でなく、コマンドを打っている途中でもないとき
const isWanted = (settings: Settings, draft: string, commands: readonly string[]) => settings.enabled && settings.live && draft.trim() !== '' && !isCommand(draft, commands)
// コマンドを打っている途中とみなすのは、先頭の /名前 が、今使えるコマンドのどれかの書き出しのとき
const isCommand = (draft: string, commands: readonly string[]) => {
  const name = /^\/(\S*)/.exec(draft)?.[1]
  return name !== undefined && commands.some(c => c.startsWith(name))
}
// 頼み方は送信後の訳と同じ。加えて、直した所が下書きのどこかを "! " の行で返させる（入力欄に赤線を引く）
const request = (settings: Settings, draft: string, commands: readonly string[]) => {
  if (!isWanted(settings, draft, commands)) return undefined
  const asked = TranslationRequest.of({ ...settings, model: settings.liveModel }, draft.trim())
  const marking = `Finally, for each mistake in the ${settings.target} parts of the message, in the order they appear, add one line starting with "! " followed by only the wrong word or words, copied exactly from the message (as few words as possible, never the whole sentence). Add none for parts you only translated.`
  return { ...asked, system: `${asked.system}\n\n${marking}` }
}
// "! " で始まる行が、赤線を引く所
const isMark = (l: string) => l.trim().startsWith('! ')
// 赤線を引く文字列は、"! " の後ろ
const markLines = (value: string) => value.split('\n').filter(isMark).map(l => l.trim().slice(2)).filter(Boolean)
// 帯に出すのは、"! " の行を除いた残り
const withoutMarks = (value: string) => value.split('\n').filter(l => !isMark(l)).join('\n')
// 帯には "! " の行を除いて、送信後の訳と同じ形で出す。指摘（💡）は一度に 1 つ
const line = (version: Translation) => {
  const shown = PromptTranslations.line(Result.given(version).and(withoutMarks).data())
  return shown && { ...shown, tips: shown.tips.slice(0, 1) }
}
// 下書きの中で、その文字列が単語として現れる最初の位置（"this" の中の "is" は拾わない）
const wordAt = (draft: string, mark: string) => new RegExp(`(?<![\\p{L}\\p{N}])${mark.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'u').exec(draft)?.index ?? -1
// 赤線は一度に 1 つ。"! " の行の文字列が今の下書きに残っている所のうち、一番前。直せば次が出る
const marks = (draft: string, version: Translation) =>
  Result.given(version).either(markLines, () => [])
    .map(mark => ({ start: wordAt(draft, mark), end: wordAt(draft, mark) + mark.length }))
    .filter(range => range.start >= 0)
    .sort((a, b) => a.start - b.start)
    .slice(0, 1)
// 置き換える文は、訳せたときの言い直しから ** を外したもの
const restatedOf = (version: Translation) => Result.given(version).either(() => line(version)?.restated.replaceAll('**', ''), () => undefined)
// 置き換えるのは、1 行の下書きで、言い直しが下書きと違うときだけ（言い直しは 1 行につなぐため）
const replacement = (draft: string, version: Translation) => {
  const restated = draft.trim().includes('\n') ? undefined : restatedOf(version)
  return restated && restated !== draft.trim() ? restated : undefined
}
