import type { Translation } from '../../types'
import { PromptTranslations } from '../prompt-translation/prompt-translation'
import { TranslationRequest } from '../prompt-translation/translation-request'

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
  const marking = `Finally, for each ${settings.target} part of the message that you rewrote, add one line starting with "! " followed by that part exactly as it appears in the message. Add none for parts you only translated.`
  return { ...asked, system: `${asked.system}\n\n${marking}` }
}
// "! " で始まる行が、赤線を引く所
const isMark = (l: string) => l.trim().startsWith('! ')
// 赤線を引く文字列は、"! " の後ろ
const markLines = (value: string) => value.split('\n').filter(isMark).map(l => l.trim().slice(2)).filter(Boolean)
// 帯に出すのは、"! " の行を除いた残り
const withoutMarks = (value: string) => value.split('\n').filter(l => !isMark(l)).join('\n')
// 帯には "! " の行を除いて、送信後の訳と同じ形で出す
const line = (version: Translation) => PromptTranslations.line(version.ok ? { ok: true, value: withoutMarks(version.value) } : version)
// 赤線は、"! " の行の文字列が今の下書きに残っている所
const marks = (draft: string, version: Translation) =>
  (version.ok ? markLines(version.value) : []).map(mark => ({ start: draft.indexOf(mark), end: draft.indexOf(mark) + mark.length })).filter(range => range.start >= 0)
// 置き換えるのは、言い直しが下書きと違うときだけ。** は外す
const replacement = (draft: string, version: Translation) => {
  const restated = version.ok ? line(version)?.restated.replaceAll('**', '') : undefined
  return restated && restated !== draft.trim() ? restated : undefined
}
