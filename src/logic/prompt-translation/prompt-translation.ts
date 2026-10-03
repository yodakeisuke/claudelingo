import type { Completion, Translation } from '../../engine-protocol'
import { Result } from '../result/result'
import { TranslationRequest } from './translation-request'

// --- public interface
export const PromptTranslations = {
  request: (settings: Settings, sent: Sent, commands: readonly string[]) => request(settings, sent, commands),
  isOwn: (from: string) => isOwn(from),
  isNeeded: (surfaces: readonly string[]) => isNeeded(surfaces),
  key: (text: string) => key(text),
  of: (reply: Promise<Completion>) => of(reply),
  line: (version?: Translation) => line(version),
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
// 返事が来れば下書きを捨てた訳文、来なければその理由。呼び出し自体が拒まれたときは、その message
const of = async (reply: Promise<Completion>): Promise<Translation> => (await Result.given(reply)).and(answered).and(withoutScratch).data()

// --- business rules
// 自分で打った指示とみなすのは、端末・Desktop（SDK 経由）・Remote Control から来たもの
const isOwn = (from: string) => ['composer', 'sdk', 'bridge'].includes(from)
// 外国語版を作るのは、全体と送った後の訳がオンのときに自分で打った指示だけ（実在するスラッシュコマンドは除く）
const wanted = (settings: Settings, sent: Sent, commands: readonly string[]) =>
  settings.enabled && settings.afterSend && isOwn(sent.from) && !isCommand(sent.text, commands) ? sent.text : Result.fail('unwanted')
// スラッシュコマンドとみなすのは、先頭の /名前 が今使えるコマンドのとき（/tmp を見て、は指示）
const isCommand = (text: string, commands: readonly string[]) => commands.includes(/^\/(\S+)/.exec(text)?.[1] ?? '')
// 訳を引く鍵は、貼り付けの印と空白を除いた文面（送信時は印つき、行では印なしで届く）
const key = (text: string) => text.replace(/<\/?pasted_content[^>]*>|\s/g, '')
// 訳を頼むのは、描く面があるときだけ（-p は誰も見ない）
const isNeeded = (surfaces: readonly string[]) => surfaces.length > 0
// 訳せていれば、言い直しとアドバイスに分けて出す。訳せなかったら、その理由を出す（訳がまだなら何も出さない）
const line = (version?: Translation) => version && Result.given(version).either(split, error => ({ restated: `訳せませんでした：${error}`, tips: [] }))
// "💡 " で始まる行がアドバイス（指示の箇条書き "- " と区別する）、残りの行をつないだものが言い直し（複数段落の指示でも切らない）
const split = (value: string) => {
  const lines = value.split('\n').map(l => l.trim()).filter(Boolean)
  const isTip = (l: string) => l.startsWith('💡 ')
  return { restated: lines.filter(l => !isTip(l)).join(' '), tips: lines.filter(isTip).map(l => l.slice('💡 '.length)) }
}
// モデルの下書き（<think> などで囲んだ考え）は捨て、残ったタグも外す。訳文だけを残す
const withoutScratch = (text: string) => text.replace(/<(think|thinking|reasoning|scratchpad)>[\s\S]*?<\/\1>/g, '').replace(/<\/?(message|think|thinking|reasoning|scratchpad)>/g, '').trim()
// 送った後の訳だけ、貼り付けやコードを写させない（帯では置換で貼り付けが消えるため）
const withoutCopies = (asked: { model: string; system: string; prompt: string }) => ({ ...asked, system: `${asked.system}\n\nDo not copy pasted content or code blocks; write [...] in their place.` })
// 返事が来れば、その文面。来なければ、その理由で失敗
const answered = (c: Completion) => (c.isAnswered ? c.text : Result.fail(c.reason))
