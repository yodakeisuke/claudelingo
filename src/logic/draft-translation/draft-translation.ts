import type { Translation } from '../../engine-protocol'
import { PromptTranslations } from '../prompt-translation/prompt-translation'
import { TranslationRequest } from '../prompt-translation/translation-request'
import { Result } from '../result/result'

// --- public interface
export const DraftTranslations = {
  request: (settings: Settings, draft: string, commands: readonly string[]) => request(settings, draft, commands),
  line: (version: Translation) => line(version),
  marks: (draft: string, version: Translation) => marks(draft, version),
  replacement: (draft: string, version: Translation) => replacement(draft, version),
}

// --- I/O
type Settings = { enabled: boolean; live: boolean; native: string; target: string; level: string; liveModel: string }

// --- operations
// 打ちかけを校正するときだけ、送信後の訳と同じ頼み方（入力中の校正のモデル）に、赤線の場所を返させる指示を足す
const request = (settings: Settings, draft: string, commands: readonly string[]) =>
  Result.given(draft)
    .and(d => wanted(settings, d, commands))
    .and(d => marking(settings.target, TranslationRequest.of({ ...settings, model: settings.liveModel }, d)))
    .either(asked => asked, () => undefined)
// 帯には "! " の行を除いて、送信後の訳と同じ形で出す
const line = (version: Translation) => oneTip(PromptTranslations.line(version, withoutMarks))
// 赤線は一度に 1 つ。"! " の行の文字列が今の下書きに残っている所のうち、一番前。直せば次が出る
const marks = (draft: string, version: Translation) =>
  Result.given(version).either(markLines, () => [])
    .map(mark => ({ start: wordAt(draft, mark), end: wordAt(draft, mark) + mark.length }))
    .filter(range => range.start >= 0)
    .sort((a, b) => a.start - b.start)
    .slice(0, 1)
const replacement = (draft: string, version: Translation) => differing(restatedOf(version), draft)

// --- business rules
// 打ちかけを校正するのは、mod と入力中の校正がオンで、空でなく、コマンドを打っている途中でもないとき
const wanted = (settings: Settings, draft: string, commands: readonly string[]) =>
  settings.enabled && settings.live && draft.trim() !== '' && !isCommand(draft, commands) ? draft.trim() : Result.fail('unwanted')
// コマンドを打っている途中とみなすのは、先頭の /名前 が、今使えるコマンドのどれかの書き出しのとき
const isCommand = (draft: string, commands: readonly string[]) => {
  const name = /^\/(\S*)/.exec(draft)?.[1]
  return name !== undefined && commands.some(c => c.startsWith(name))
}
// 直した所が下書きのどこかを "! " の行で返させる（入力欄に赤線を引く）
const marking = (target: string, asked: ReturnType<typeof TranslationRequest.of>) =>
  ({ ...asked, system: `${asked.system}\n\nFinally, for each mistake in the ${target} parts of the message, in the order they appear, add one line starting with "! " followed by only the wrong word or words, copied exactly from the message (as few words as possible, never the whole sentence). Add none for parts you only translated.` })
// "! " で始まる行が、赤線を引く所
const isMark = (l: string) => l.trim().startsWith('! ')
// 赤線を引く文字列は、"! " の後ろ
const markLines = (value: string) => value.split('\n').filter(isMark).map(l => l.trim().slice(2)).filter(Boolean)
// 帯に出すのは、"! " の行を除いた残り
const withoutMarks = (value: string) => value.split('\n').filter(l => !isMark(l)).join('\n')
// 指摘（💡）は一度に 1 つ
const oneTip = (shown: ReturnType<typeof PromptTranslations.line>) => shown && { ...shown, tips: shown.tips.slice(0, 1) }
// 下書きの中で、その文字列が単語として現れる最初の位置（"this" の中の "is" は拾わない）
const wordAt = (draft: string, mark: string) => new RegExp(`(?<![\\p{L}\\p{N}])${mark.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'u').exec(draft)?.index ?? -1
// 置き換える文は、訳せたときの言い直しから直した所の ** を外したもの。返事は 言い直し → 💡 の行 → "! " の行 の順なので、末尾から "! " の行、続けて 💡 の行だけを落とす
// ほかの行は字下げも空行もそのまま（下書きにある "! " や 💡 で始まる行も、末尾の指摘より前なら残る）
const restatedOf = (version: Translation) =>
  Result.given(version).either(value => PromptTranslations.plain(dropTrailing(dropTrailing(value.split('\n'), isMark), l => l.trim().startsWith('💡 ')).join('\n').trim()), () => '')
// 末尾から、空行と、条件に合う行を落とす
const dropTrailing = (lines: string[], isNote: (line: string) => boolean): string[] => {
  const last = lines.at(-1)
  return last !== undefined && (last.trim() === '' || isNote(last)) ? dropTrailing(lines.slice(0, -1), isNote) : lines
}
// 置き換えるのは、言い直しが下書きと違うときだけ
const differing = (restated: string, draft: string) => (restated && restated !== draft.trim() ? restated : undefined)
