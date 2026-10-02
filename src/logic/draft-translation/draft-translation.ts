import { TranslationRequest } from '../prompt-translation/translation-request'

// 公開する操作
export const DraftTranslations = {
  request: (settings: Settings, draft: string, commands: readonly string[]) => request(settings, draft, commands),
}

// データ構造
type Settings = { enabled: boolean; native: string; target: string; model: string }

// ビジネスルール
// 打ちかけを訳すのは、オンで、空でなく、コマンドを打っている途中でもないとき
const isWanted = (settings: Settings, draft: string, commands: readonly string[]) => settings.enabled && draft.trim() !== '' && !isCommand(draft, commands)
// コマンドを打っている途中とみなすのは、先頭の /名前 が、今使えるコマンドのどれかの書き出しのとき
const isCommand = (draft: string, commands: readonly string[]) => {
  const name = /^\/(\S*)/.exec(draft)?.[1]
  return name !== undefined && commands.some(c => c.startsWith(name))
}
// 頼み方もモデルも送信後の訳と同じ（打っている間と送った後で、訳が食い違わない）
const request = (settings: Settings, draft: string, commands: readonly string[]) => (isWanted(settings, draft, commands) ? TranslationRequest.of(settings, draft.trim()) : undefined)
