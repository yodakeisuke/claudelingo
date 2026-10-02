import type { Translation, TranslationError } from '../../types'
import { Result } from '../result/result'
import { TranslationRequest } from './translation-request'

// 公開する操作
export const PromptTranslations = {
  request: (settings: Settings, from: string, text: string) => request(settings, from, text),
  isNeeded: (surfaces: readonly string[], languages: string, existing?: Kept) => isNeeded(surfaces, languages, existing),
  of: (outcome: Completion | Error) => of(outcome),
  line: (from: string, prompt: string, version?: Translation) => line(from, prompt, version),
}

// データ構造
type Line = { restated: string; tips: string[] }
// 残してある訳は、どの言語の組（母語>学ぶ言語）で作ったかを持つ
type Kept = Translation & { languages: string }
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
// 訳を頼むのは、描く面があり（-p は誰も見ない）、同じ文を今の言語の組でまだ訳せていないときだけ
const isNeeded = (surfaces: readonly string[], languages: string, existing?: Kept) => surfaces.length > 0 && !(existing?.ok && existing.languages === languages)
// 出すのは、自分の指示が訳せていて、言い直しがあり、元の指示と違うときだけ（自然に書けた外国語はそのまま返るので出さない）
const line = (from: string, prompt: string, version?: Translation) => {
  const shown = isOwn(from) ? parsed(version) : undefined
  return shown && isRestated(shown.restated, ownWords(prompt)) ? shown : undefined
}
// 訳せていれば、言い直しとアドバイスに分ける
const parsed = (version?: Translation) => (version?.ok ? split(version.value) : undefined)
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
// 言い直しの依頼：外国語版を作る指示なら、自分の言葉だけを渡す（貼り付けは渡さない）。作らない指示には依頼がない
const request = (settings: Settings, from: string, text: string) => (isWanted(settings, from, text) ? TranslationRequest.of(settings, ownWords(text)) : undefined)
// 返事が来れば訳文、来なければその失敗をそのまま持つ。呼び出し自体が拒まれたときは、その message を持つ
const of = (outcome: Completion | Error): Translation =>
  Result.given(outcome)
    .and(o => (o instanceof Error ? Result.fail({ message: o.message }) : o))
    .and(c => (c.isAnswered ? c.text.trim() : Result.fail(c)))
    .either<Translation>(value => ({ ok: true, value }), error => ({ ok: false, error }))
