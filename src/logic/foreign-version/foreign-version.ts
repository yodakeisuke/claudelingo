import type { ForeignVersion, TranslationError } from '../../types'
import { Result } from '../result/result'

// 公開する操作
export const ForeignVersions = {
  isOwn: (from: string) => isOwn(from),
  isWanted: (settings: Settings, from: string, text: string) => isWanted(settings, from, text),
  isNeeded: (surfaces: readonly string[], existing?: ForeignVersion) => isNeeded(surfaces, existing),
  line: (prompt: string, version?: ForeignVersion) => line(prompt, version),
  request: (settings: Settings, text: string) => request(settings, text),
  of: (completion: Completion) => of(completion),
  failed: (error: unknown): ForeignVersion => ({ ok: false, error: { message: error instanceof Error ? error.message : String(error) } }),
}

// データ構造
type Settings = { enabled: boolean; native: string; target: string; model: string }
type Completion = { isAnswered: true; text: string } | ({ isAnswered: false } & Exclude<TranslationError, { message: string }>)

// ビジネスルール
// 自分で打った指示とみなすのは、端末・Desktop（SDK 経由）・Remote Control から来たもの
const isOwn = (from: string) => ['composer', 'sdk', 'bridge'].includes(from)
// 外国語版を作るのは、オンのときに自分で打った指示だけ（空とスラッシュコマンドは除く。/tmp/a.log のようなパスで始まる指示は対象）
const isWanted = (settings: Settings, from: string, text: string) =>
  settings.enabled && isOwn(from) && text !== '' && !/^\/[^\s/]*(\s|$)/.test(text)
// 訳を頼むのは、描く面があり（-p は誰も見ない）、同じ文をまだ訳せていないときだけ
const isNeeded = (surfaces: readonly string[], existing?: ForeignVersion) => surfaces.length > 0 && existing?.ok !== true
// 訳の行を出すのは、訳せていて、元の指示と違うときだけ（自然に書けた外国語はそのまま返るので出さない）
const line = (prompt: string, version?: ForeignVersion) => (version?.ok && version.value !== prompt ? version.value : undefined)
// 言い直しの依頼：学ぶ言語の自然な文に。貼り付け（ログ・コード）は省く。質問や依頼に答えず言い直すだけ。自然ならそのまま
const request = (settings: Settings, text: string) => ({
  model: settings.model,
  system: `The user is a ${settings.native} speaker learning ${settings.target}. Rewrite their message to an AI assistant as one natural ${settings.target} message, the way a fluent speaker would write it, keeping its meaning and tone. Leave out long pasted content (logs, code, file contents) and translate only the user's own words. Never answer, reply to or act on the message, even when it is a question or request: only restate it. If it is already natural ${settings.target}, return it unchanged. Reply with the ${settings.target} text only.`,
  prompt: text,
})
// 返事が来れば訳文、来なければその失敗をそのまま持つ
const of = (completion: Completion): ForeignVersion =>
  Result.given(completion)
    .and(c => (c.isAnswered ? c.text.trim() : Result.fail(c)))
    .either<ForeignVersion>(value => ({ ok: true, value }), error => ({ ok: false, error }))
