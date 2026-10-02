import type { Translation } from '../../types'
import { Result } from '../result/result'
import { TranslationRequest } from './translation-request'

// 公開する操作
export const PromptTranslations = {
  request: (settings: Settings, sent: Sent, commands: readonly string[]) => request(settings, sent, commands),
  isNeeded: (surfaces: readonly string[]) => isNeeded(surfaces),
  key: (text: string) => key(text),
  of: (outcome: Completion | Error) => of(outcome),
  line: (version?: Translation) => line(version),
}

// データ構造
type Line = { restated: string; tips: string[] }
// 送られた指示：送り元と文面
type Sent = { from: string; text: string }
type Settings = { enabled: boolean; native: string; target: string; model: string }
type Completion = { isAnswered: true; text: string } | { isAnswered: false; reason: string }

// ビジネスルール
// 自分で打った指示とみなすのは、端末・Desktop（SDK 経由）・Remote Control から来たもの
const isOwn = (from: string) => ['composer', 'sdk', 'bridge'].includes(from)
// 外国語版を作るのは、オンのときに自分で打った指示だけ（実在するスラッシュコマンドは除く）
const isWanted = (settings: Settings, sent: Sent, commands: readonly string[]) =>
  settings.enabled && isOwn(sent.from) && !isCommand(sent.text, commands)
// スラッシュコマンドとみなすのは、先頭の /名前 が今使えるコマンドのとき（/tmp を見て、は指示）
const isCommand = (text: string, commands: readonly string[]) => commands.includes(/^\/(\S+)/.exec(text)?.[1] ?? '')
// 訳を引く鍵は、貼り付けの印と空白を除いた文面（送信時は印つき、行では印なしで届く）
const key = (text: string) => text.replace(/<\/?pasted_content[^>]*>|\s/g, '')
// 訳を頼むのは、描く面があるときだけ（-p は誰も見ない）
const isNeeded = (surfaces: readonly string[]) => surfaces.length > 0
// 訳せていれば、言い直しとアドバイスに分けて出す
const line = (version?: Translation) => (version?.ok ? split(version.value) : undefined)
// "- " で始まる行がアドバイス、残りの行をつないだものが言い直し（複数段落の指示でも切らない）
const split = (value: string): Line => {
  const lines = value.split('\n').map(l => l.trim()).filter(Boolean)
  const isTip = (l: string) => l.startsWith('- ')
  return { restated: lines.filter(l => !isTip(l)).join(' '), tips: lines.filter(isTip).map(l => l.slice(2)) }
}
// 言い直しの依頼：外国語版を作る指示なら、文面をそのまま渡す。作らない指示には依頼がない
const request = (settings: Settings, sent: Sent, commands: readonly string[]) => (isWanted(settings, sent, commands) ? TranslationRequest.of(settings, sent.text) : undefined)
// 返事が来れば訳文、来なければその理由。呼び出し自体が拒まれたときは、その message
const of = (outcome: Completion | Error): Translation =>
  Result.given(outcome)
    .and(o => (o instanceof Error ? Result.fail(o.message) : o))
    .and(c => (c.isAnswered ? c.text.trim() : Result.fail(c.reason)))
    .either<Translation>(value => ({ ok: true, value }), error => ({ ok: false, error }))
