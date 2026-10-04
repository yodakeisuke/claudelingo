import type { Answer } from '../../engine-protocol'
import { LingoSettings } from '../lingo-settings/lingo-settings'
import { Restatements } from '../restatement/restatement'
import { Result } from '../result/result'
import { TranslationRequest } from './translation-request'

// --- public interface
export const PromptTranslations = {
  request: (settings: Settings, sent: Sent, commands: readonly string[]) => request(settings, sent, commands),
  isOwn: (from: string) => isOwn(from),
  typed: (text: string) => typed(text),
  isCommand: (text: string, commands: readonly string[]) => isCommand(text, commands),
  ownOrigins: () => ownOrigins(),
  isNeeded: (surfaces: readonly string[]) => isNeeded(surfaces),
  key: (text: string) => key(text),
  line: (native: string, version?: Answer, shown?: (value: string) => string) => line(native, version, shown),
}

// --- I/O
// 送られた指示：送り元と文面
type Sent = { from: string; text: string }
type Settings = { enabled: boolean; afterSend: boolean; native: string; target: string; level: string; model: string }

// --- operations
// 外国語版を作る指示なら、文面をそのまま渡して言い直しを頼む。作らない指示には依頼がない
const request = (settings: Settings, sent: Sent, commands: readonly string[]) =>
  Result.given(sent)
    .and(s => wanted(settings, s, commands))
    .and(text => withoutCopies(TranslationRequest.of(settings, text)))
    .either(asked => asked, () => undefined)

// --- business rules
// 自分で打った指示とみなすのは、端末・Desktop（SDK 経由）・Remote Control から来たもの
const ownOrigins = () => [{ kind: 'composer' }, { kind: 'sdk' }, { kind: 'bridge' }] as const
// 打った文：Desktop が会話の最初の指示の頭に付ける <system-reminder> を除き、前後の空白も除く（行には打った文だけが出る）
const typed = (text: string) => text.replace(/^\s*(?:<system-reminder>[\s\S]*?<\/system-reminder>\s*)+/, '').trim()
// 送り元が自分で打った指示のものか
const isOwn = (from: string) => ownOrigins().some(origin => origin.kind === from)
// 外国語版を作るのは、全体と送った後の訳がオンのときに自分で打った指示だけ（実在するスラッシュコマンドは除く）
const wanted = (settings: Settings, sent: Sent, commands: readonly string[]) =>
  settings.enabled && settings.afterSend && isOwn(sent.from) && !isCommand(sent.text, commands) ? sent.text : Result.fail('unwanted')
// スラッシュコマンドとみなすのは、先頭の /名前 が今使えるコマンドのとき（/tmp を見て、は指示）
const isCommand = (text: string, commands: readonly string[]) => commands.includes(/^\/(\S+)/.exec(text)?.[1] ?? '')
// 訳を引く鍵は、貼り付けの印と空白を除いた文面（送信時は印つき、行では印なしで届く）
const key = (text: string) => text.replace(/<\/?pasted_content[^>]*>|\s/g, '')
// 訳を頼むのは、描く面があるときだけ（-p は誰も見ない）
const isNeeded = (surfaces: readonly string[]) => surfaces.length > 0
// 訳せていれば、shown で整えてから言い直しとアドバイスに分けて出す。訳せなかったら、その理由を母語の UI で出す（訳がまだなら何も出さない）
const line = (native: string, version?: Answer, shown = (value: string) => value) =>
  version && Result.given(version).and(shown).either(Restatements.of, error => ({ restated: LingoSettings.wording(native).translateFailed(error), tips: [] }))
// 送った後の訳だけ、貼り付けやコードを写させない（帯では置換で貼り付けが消えるため）
const withoutCopies = (asked: { model: string; system: string; prompt: string }) => ({ ...asked, system: `${asked.system}\n\nDo not copy pasted content or code blocks; write [...] in their place.` })
