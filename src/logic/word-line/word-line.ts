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
// 行の頭の字下げと Markdown の印（リスト・番号・見出し・引用。無くてもよい）と、残り
const split = (text: string) => /^(\s*)(?:([-*+]|\d+[.)]|#{1,6}|>)\s+)?(.*)$/.exec(text)?.slice(1) ?? []
// 字下げの幅、見せる印、押せる語。見出しは語をすべて濃く
const lined = ([space = '', mark = '', rest = '']: (string | undefined)[]): Line =>
  ({ indent: space.length, mark: shown(mark), words: mark.startsWith('#') ? bold(rest) : WordCards.words(inline(rest)) })
// リストの印（- * +）は •、引用（>）は │、番号はそのまま。見出しの印は出さない
const shown = (mark: string) => ({ '-': '•', '*': '•', '+': '•', '>': '│' } as Record<string, string>)[mark] ?? (/^\d/.test(mark) ? mark : '')
// 表の区切りの行は落とし、表の行はセルごとに（区切りの前の行は見出し）、ほかは 1 行の Markdown として
const shaped = (line: string, i: number, lines: string[]): Line[] => (isRule(line) ? [] : isRow(line, lines, i) ? [row(line, isRule(lines[i + 1] ?? ''))] : [of(line)])
// 表の行：セルごとの押せる語（外側の | は無くてもよい）。見出しの行は語をすべて濃く
const row = (line: string, isHead: boolean): Line =>
  ({ indent: 0, mark: '', words: [], cells: line.trim().replace(/^\||\|$/g, '').split('|').map(cell => (isHead ? bold(cell) : WordCards.words(inline(cell)))) })
// 表の行は | を含み、区切りの行の直前（見出し）か、区切りの行から | を含む行が途切れずに続いた先
const isRow = (line: string, lines: string[], i: number) => line.includes('|') && (isRule(lines[i + 1] ?? '') || isRule(lines.slice(0, i).findLast(l => !l.includes('|') || isRule(l)) ?? ''))
// 区切りの行：| で分けたどのセルも - と : だけ（外側の | は無くてもよい）
const isRule = (line: string) => line.includes('|') && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(line)
// 語をすべて濃く
const bold = (text: string) => WordCards.words(inline(text)).map(w => ({ ...w, isFixed: true }))
// インラインのコード（`）とリンク（[文字](URL)）は印を外す
const inline = (text: string) => text.replace(/`([^`]+)`/g, '$1').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
