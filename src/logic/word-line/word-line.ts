import { PromptTranslations } from '../prompt-translation/prompt-translation'
import { WordCards } from '../word-card/word-card'

// --- public interface
export const WordLines = {
  of: (text: string): Line => of(text),
  all: (text: string): Line[] => all(text),
}

// --- I/O
type Word = ReturnType<typeof WordCards.words>[number]
// 訳の 1 行：頭の字下げ、見せる印、押せる語。表の行はセルごとの語（cells）
type Line = { indent: number; mark: string; words: Word[]; cells?: Word[][] }

// --- operations
// 訳の 1 行を、頭（字下げと Markdown の印）と押せる語の並びに
const of = (text: string) => lined(split(text))
// 訳の段落を行ごとに
const all = (text: string) => text.split('\n').flatMap(shaped)

// --- business rules
// 行の頭の字下げと Markdown の印（リスト・番号・見出し・引用）と、残り。印が無ければ全部が残り
const split = (text: string) => /^(\s*)([-*+]|\d+[.)]|#{1,6}|>)\s+(.*)$/.exec(text)?.slice(1) ?? ['', '', text]
// 字下げの幅、見せる印、押せる語。見出しは語をすべて濃く
const lined = ([space = '', mark = '', rest = '']: string[]): Line =>
  ({ indent: space.length, mark: shown(mark), words: WordCards.words(mark.startsWith('#') ? bold(rest) : inline(rest)) })
// リストの印（- * +）は •、引用（>）は │、番号はそのまま。見出しの印は出さない
const shown = (mark: string) => ({ '-': '•', '*': '•', '+': '•', '>': '│' } as Record<string, string>)[mark] ?? (/^\d/.test(mark) ? mark : '')
// 表の区切りの行（|---|）は落とし、表の行はセルごとに（区切りの前の行は見出し）、ほかは 1 行の Markdown として
const shaped = (line: string, i: number, lines: string[]): Line[] => (isRule(line) ? [] : isRow(line) ? [row(line, isRule(lines[i + 1] ?? ''))] : [of(line)])
// 表の行：セルごとの押せる語。見出しの行は語をすべて濃く
const row = (line: string, isHead: boolean): Line =>
  ({ indent: 0, mark: '', words: [], cells: line.trim().replace(/^\||\|$/g, '').split('|').map(cell => WordCards.words(isHead ? bold(cell) : inline(cell))) })
// | で始まり | で終わる行が表の行
const isRow = (line: string) => /^\s*\|.*\|\s*$/.test(line)
// 表の行で、セルが - と : と空白だけなら区切りの行
const isRule = (line: string) => /^\s*\|(\s*:?-+:?\s*\|)+\s*$/.test(line)
// 語をすべて濃く（直した所と同じ印で囲む）
const bold = (text: string) => `**${PromptTranslations.plain(inline(text)).trim()}**`
// インラインのコード（`）とリンク（[文字](URL)）は印を外す
const inline = (text: string) => text.replace(/`([^`]*)`/g, '$1').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
