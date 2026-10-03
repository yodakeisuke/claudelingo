// --- public interface
export const Restatements = {
  of: (text: string) => of(text),
  parts: (text: string) => parts(text),
  plain: (text: string) => plain(text),
}

// --- business rules
// "💡 " で始まる行がアドバイス（指示の箇条書き "- " と区別する）、残りの行をつないだものが言い直し（複数段落の指示でも切らない）
const of = (text: string) => {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const isTip = (l: string) => l.startsWith('💡 ')
  return { restated: lines.filter(l => !isTip(l)).join(' '), tips: lines.filter(isTip).map(l => l.slice('💡 '.length)) }
}
// 直した所は、空白で始まらず終わらない文字を ** で囲んだ所（Markdown の太字と同じ印）。分けると奇数番目が直した所（src/**/*.ts のように対にならない ** は文字のまま）
const parts = (text: string) => text.split(/\*\*([^\s*](?:[^*]*[^\s*])?)\*\*/)
// 直した所の ** だけを外した文
const plain = (text: string) => parts(text).join('')
