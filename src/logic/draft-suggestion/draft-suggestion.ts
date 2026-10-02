import type { Translation } from '../../types'
import { SuggestionRequest } from './suggestion-request'

// 公開する操作
export const DraftSuggestions = {
  request: (settings: Settings, draft: string, commands: readonly string[]) => request(settings, draft, commands),
  band: (version: Translation | null) => band(version),
}

// データ構造
type Settings = { enabled: boolean; native: string; target: string }
type Band = { restated: string; next: string }

// ビジネスルール
// 打ちかけを見せるのは、オンで、空でなく、コマンドを打っている途中でもないとき
const isWanted = (settings: Settings, draft: string, commands: readonly string[]) => settings.enabled && draft.trim() !== '' && !isCommand(draft, commands)
// コマンドを打っている途中とみなすのは、先頭の /名前 が、今使えるコマンドのどれかの書き出しのとき
const isCommand = (draft: string, commands: readonly string[]) => {
  const name = /^\/(\S*)/.exec(draft)?.[1]
  return name !== undefined && commands.some(c => c.startsWith(name))
}
// 言い直しと続きの依頼。見せない打ちかけには依頼がない
const request = (settings: Settings, draft: string, commands: readonly string[]) => (isWanted(settings, draft, commands) ? SuggestionRequest.of(settings, draft.trim()) : undefined)
// "→ " で始まる行が続き、残りの行をつないだものが言い直し。訳せなかったら、その理由だけ
const band = (version: Translation | null): Band | undefined => {
  if (!version) return undefined
  if (!version.ok) return { restated: `訳せませんでした：${version.error}`, next: '' }
  const lines = version.value.split('\n').map(l => l.trim()).filter(Boolean)
  const isNext = (l: string) => l.startsWith('→ ')
  return { restated: lines.filter(l => !isNext(l)).join(' '), next: lines.find(isNext)?.slice(2) ?? '' }
}
