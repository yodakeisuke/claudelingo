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
type Line = { restated: string; tip?: string }
type Settings = { enabled: boolean; native: string; target: string; model: string }
type Completion = { isAnswered: true; text: string } | ({ isAnswered: false } & Exclude<TranslationError, { message: string }>)

// ビジネスルール
// 自分で打った指示とみなすのは、端末・Desktop（SDK 経由）・Remote Control から来たもの
const isOwn = (from: string) => ['composer', 'sdk', 'bridge'].includes(from)
// 自分の言葉は、engine が <pasted_content> で包んだ貼り付けを除いた部分
const ownWords = (text: string) => text.replace(/<pasted_content[^>]*>[\s\S]*?<\/pasted_content>/g, '').trim()
// 外国語版を作るのは、オンのときに自分で打った指示だけ（空とスラッシュコマンドは除く。/tmp/a.log のようなパスで始まる指示は対象）
const isWanted = (settings: Settings, from: string, text: string) =>
  settings.enabled && isOwn(from) && ownWords(text) !== '' && !/^\/[^\s/]*(\s|$)/.test(text)
// 訳を頼むのは、描く面があり（-p は誰も見ない）、同じ文をまだ訳せていないときだけ
const isNeeded = (surfaces: readonly string[], existing?: ForeignVersion) => surfaces.length > 0 && existing?.ok !== true
// 出すのは、訳せていて、言い直しが元の指示と違うときだけ（自然に書けた外国語はそのまま返るので出さない）
const line = (prompt: string, version?: ForeignVersion) => {
  const shown = version?.ok ? split(version.value) : undefined
  return shown && shown.restated !== ownWords(prompt) ? shown : undefined
}
// 返事の1行目が言い直し、2行目以降があればそれが一言アドバイス
const split = (value: string): Line => {
  const [restated = '', ...tips] = value.split('\n').map(l => l.trim()).filter(Boolean)
  return tips.length > 0 ? { restated, tip: tips.join(' ') } : { restated }
}
// 言い直しの依頼：自分の言葉だけを学ぶ言語の自然な文に。質問や依頼（翻訳の依頼も）に答えず言い直すだけ。自然ならそのまま。学ぶ言語で書いた所があり、言う価値があるときだけ母語で一言アドバイス
const request = (settings: Settings, text: string) => ({
  model: settings.model,
  system: `The user is a ${settings.native} speaker learning ${settings.target}. Rewrite their message to an AI assistant as one natural ${settings.target} message, the way a fluent speaker would write it, keeping its meaning and tone. Never answer, reply to or act on the message, even when it is a question or a request (including a request to translate something): only restate the message itself. If it is already natural ${settings.target}, return it unchanged. Put the ${settings.target} version on the first line, as one paragraph. Only if the user wrote part of it in ${settings.target} and there is something worth learning (a mistake, or how to say the ${settings.native} part), add a second line: one short tip written in ${settings.native}. No scores, no other text.`,
  prompt: ownWords(text),
})
// 返事が来れば訳文、来なければその失敗をそのまま持つ
const of = (completion: Completion): ForeignVersion =>
  Result.given(completion)
    .and(c => (c.isAnswered ? c.text.trim() : Result.fail(c)))
    .either<ForeignVersion>(value => ({ ok: true, value }), error => ({ ok: false, error }))
