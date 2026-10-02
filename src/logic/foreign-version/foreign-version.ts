import type { ForeignVersion, TranslationError } from '../../types'
import { Result } from '../result/result'

// 公開する操作
export const ForeignVersions = {
  isWanted: (settings: Settings, from: string, text: string) => isWanted(settings, from, text),
  request: (settings: Settings, text: string) => request(settings, text),
  of: (completion: Completion) => of(completion),
  failed: (error: unknown): ForeignVersion => Result.fail({ message: String(error) }).data,
}

// データ構造
type Settings = { enabled: boolean; native: string; target: string; model: string }
type Completion = { isAnswered: true; text: string } | ({ isAnswered: false } & Exclude<TranslationError, { message: string }>)

// ビジネスルール
// 外国語版を作るのは、オンのときに自分で打った指示だけ（空とスラッシュコマンドは除く）
const isWanted = (settings: Settings, from: string, text: string) =>
  settings.enabled && from === 'composer' && text !== '' && !text.startsWith('/')
// 言い直しの依頼：学ぶ言語の自然な文に。貼り付け（ログ・コード）は省く。30 秒で打ち切る
const request = (settings: Settings, text: string) => ({
  model: settings.model,
  system: `The user is a ${settings.native} speaker learning ${settings.target}. Rewrite their message to an AI assistant as one natural ${settings.target} message, the way a fluent speaker would write it, keeping its meaning and tone. Leave out long pasted content (logs, code, file contents) and translate only the user's own words. Reply with the ${settings.target} text only.`,
  prompt: text,
  timeoutMs: 30_000,
})
// 返事が来れば訳文、来なければその失敗をそのまま持つ
const of = (completion: Completion): ForeignVersion =>
  (completion.isAnswered ? Result.ok(completion.text) : Result.fail(completion))
    .and(text => text.trim())
    .data
