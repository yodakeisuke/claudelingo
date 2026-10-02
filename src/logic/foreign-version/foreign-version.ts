import type { ForeignVersion, TranslationError } from '../../types'
import { Result } from '../result/result'
import { RestatementPrompt } from './restatement-prompt'

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
type Line = { restated: string; tips: string[] }
type Settings = { enabled: boolean; native: string; target: string; model: string }
type Completion = { isAnswered: true; text: string } | ({ isAnswered: false } & Exclude<TranslationError, { message: string }>)

// ビジネスルール
// 自分で打った指示とみなすのは、端末・Desktop（SDK 経由）・Remote Control から来たもの
const isOwn = (from: string) => ['composer', 'sdk', 'bridge'].includes(from)
// 自分の言葉は、engine が <pasted_content> で包んだ貼り付けを除いた部分
const ownWords = (text: string) => text.replace(/<pasted_content[^>]*>[\s\S]*?<\/pasted_content[^>]*>/g, '').trim()
// 外国語版を作るのは、オンのときに自分で打った指示だけ（空とスラッシュコマンドは除く。/tmp/a.log のようなパスで始まる指示は対象）
const isWanted = (settings: Settings, from: string, text: string) =>
  settings.enabled && isOwn(from) && ownWords(text) !== '' && !/^\/[^\s/]*(\s|$)/.test(text)
// 訳を頼むのは、描く面があり（-p は誰も見ない）、同じ文をまだ訳せていないときだけ
const isNeeded = (surfaces: readonly string[], existing?: ForeignVersion) => surfaces.length > 0 && existing?.ok !== true
// 出すのは、訳せていて、言い直しがあり、元の指示と違うときだけ（自然に書けた外国語はそのまま返るので出さない）
const line = (prompt: string, version?: ForeignVersion) => {
  const shown = version?.ok ? split(version.value) : undefined
  return shown && isRestated(shown.restated, ownWords(prompt)) ? shown : undefined
}
// 言い直したとみなすのは、言い直しがあり（箇条書きだけの指示は全行がアドバイス扱いになり空になる）、元の文面と違うとき
const isRestated = (restated: string, own: string) => restated !== '' && plain(restated) !== plain(own)
// 比べるのは文字・数字・アポストロフィだけ（強調の印・大文字・句読点・空白は見ない。dont → don't は直しとして出す）
const plain = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}']/gu, '')
// "- " で始まる行がアドバイス、残りの行をつないだものが言い直し（複数段落の指示でも切らない）
const split = (value: string): Line => {
  const lines = value.split('\n').map(l => l.trim()).filter(Boolean)
  const isTip = (l: string) => l.startsWith('- ')
  return { restated: lines.filter(l => !isTip(l)).join(' '), tips: lines.filter(isTip).map(l => l.slice(2)) }
}
// 言い直しの依頼：自分の言葉だけを渡す（貼り付けは渡さない）
const request = (settings: Settings, text: string) => RestatementPrompt.of(settings, ownWords(text))
// 返事が来れば訳文、来なければその失敗をそのまま持つ
const of = (completion: Completion): ForeignVersion =>
  Result.given(completion)
    .and(c => (c.isAnswered ? c.text.trim() : Result.fail(c)))
    .either<ForeignVersion>(value => ({ ok: true, value }), error => ({ ok: false, error }))
