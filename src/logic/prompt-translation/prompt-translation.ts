import type { Translation, TranslationError } from '../../types'
import { Result } from '../result/result'
import { TranslationRequest } from './translation-request'

// 公開する操作
export const PromptTranslations = {
  request: (settings: Settings, sent: Sent, commands: readonly string[]) => request(settings, sent, commands),
  isNeeded: (surfaces: readonly string[], languages: string, existing?: Kept) => isNeeded(surfaces, languages, existing),
  of: (outcome: Completion | Error) => of(outcome),
  line: (from: string, prompt: string, version?: Translation) => line(from, prompt, version),
}

// データ構造
type Line = { restated: string; tips: string[] }
// 送られた指示：送り元と文面
type Sent = { from: string; text: string }
// 残してある訳は、どの言語の組（母語>学ぶ言語）で作ったかを持つ
type Kept = Translation & { languages: string }
type Settings = { enabled: boolean; native: string; target: string; model: string }
type Completion = { isAnswered: true; text: string } | ({ isAnswered: false } & Exclude<TranslationError, { message: string }>)

// ビジネスルール
// 自分で打った指示とみなすのは、端末・Desktop（SDK 経由）・Remote Control から来たもの
const isOwn = (from: string) => ['composer', 'sdk', 'bridge'].includes(from)
// 外国語版を作るのは、オンのときに自分で打った指示だけ（空と、実在するスラッシュコマンドは除く）
const isWanted = (settings: Settings, sent: Sent, commands: readonly string[]) =>
  settings.enabled && isOwn(sent.from) && sent.text !== '' && !isCommand(sent.text, commands)
// スラッシュコマンドとみなすのは、先頭の /名前 が今使えるコマンドのとき（/tmp を見て、は指示）
const isCommand = (text: string, commands: readonly string[]) => commands.includes(/^\/(\S+)/.exec(text)?.[1] ?? '')
// 訳を頼むのは、描く面があり（-p は誰も見ない）、同じ文を今の言語の組でまだ訳せていないときだけ
const isNeeded = (surfaces: readonly string[], languages: string, existing?: Kept) => surfaces.length > 0 && !(existing?.ok && existing.languages === languages)
// 出すのは、自分の指示が訳せていて、言い直しがあり、元の指示と違うときだけ（自然に書けた外国語はそのまま返るので出さない）
const line = (from: string, prompt: string, version?: Translation) => {
  const shown = isOwn(from) ? parsed(version) : undefined
  return shown && isRestated(shown.restated, prompt) ? shown : undefined
}
// 訳せていれば、言い直しとアドバイスに分ける
const parsed = (version?: Translation) => (version?.ok ? split(version.value) : undefined)
// 言い直したとみなすのは、言い直しに言葉があり（箇条書きだけの指示は空に、資料だけの指示は […] だけになる）、元の文面と違うとき
const isRestated = (restated: string, own: string) => plain(restated) !== '' && plain(restated) !== plain(own)
// 比べるのは文字・数字・アポストロフィだけ（強調の印・大文字・句読点・空白は見ない。dont → don't は直しとして出す）
const plain = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}']/gu, '')
// "- " で始まる行がアドバイス、残りの行をつないだものが言い直し（複数段落の指示でも切らない）
const split = (value: string): Line => {
  const lines = value.split('\n').map(l => l.trim()).filter(Boolean)
  const isTip = (l: string) => l.startsWith('- ')
  return { restated: lines.filter(l => !isTip(l)).join(' '), tips: lines.filter(isTip).map(l => l.slice(2)) }
}
// 言い直しの依頼：外国語版を作る指示なら、文面をそのまま渡す。作らない指示には依頼がない
const request = (settings: Settings, sent: Sent, commands: readonly string[]) => (isWanted(settings, sent, commands) ? TranslationRequest.of(settings, sent.text) : undefined)
// 返事が来れば訳文、来なければその失敗をそのまま持つ。呼び出し自体が拒まれたときは、その message を持つ
const of = (outcome: Completion | Error): Translation =>
  Result.given(outcome)
    .and(o => (o instanceof Error ? Result.fail({ message: o.message }) : o))
    .and(c => (c.isAnswered ? c.text.trim() : Result.fail(c)))
    .either<Translation>(value => ({ ok: true, value }), error => ({ ok: false, error }))
