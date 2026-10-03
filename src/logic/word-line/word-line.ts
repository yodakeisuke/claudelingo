import { PromptTranslations } from '../prompt-translation/prompt-translation'
import { WordCards } from '../word-card/word-card'

// --- public interface
export const WordLines = {
  of: (text: string) => of(text),
}

// --- operations
// 訳の 1 行を、頭（字下げと Markdown の印）と押せる語の並びに
const of = (text: string) => lined(split(text))

// --- business rules
// 行の頭の字下げと Markdown の印（リスト・番号・見出し・引用）と、残り。印が無ければ全部が残り
const split = (text: string) => /^(\s*)([-*+]|\d+[.)]|#{1,6}|>)\s+(.*)$/.exec(text)?.slice(1) ?? ['', '', text]
// 字下げの幅、見せる印、押せる語。見出しは語をすべて濃く（直した所と同じ印で囲む）
const lined = ([space = '', mark = '', rest = '']: string[]) =>
  ({ indent: space.length, mark: shown(mark), words: WordCards.words(mark.startsWith('#') ? `**${PromptTranslations.plain(inline(rest))}**` : inline(rest)) })
// リストの印（- * +）は •、引用（>）は │、番号はそのまま。見出しの印は出さない
const shown = (mark: string) => ({ '-': '•', '*': '•', '+': '•', '>': '│' } as Record<string, string>)[mark] ?? (/^\d/.test(mark) ? mark : '')
// インラインのコード（`）とリンク（[文字](URL)）は印を外す
const inline = (text: string) => text.replace(/`([^`]*)`/g, '$1').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
