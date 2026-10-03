import { describe, expect, test } from 'claude-code/testing'

import { WordLines } from '../../logic/word-line/word-line'

// 頭（字下げ・見せる印）と、語の見せ方（濃い語は *）
const shape = (text: string) => {
  const { indent, mark, words } = WordLines.of(text)
  return [indent, mark, words.map(w => (w.isFixed ? `*${w.label}` : w.label)).join(' ')]
}

describe('word-line', () => {
  test('訳の行の Markdown：リスト・番号・引用の印は頭に、見出しは語をすべて濃く、コードとリンクの印は外す', () => {
    expect(shape('- **The reply** is left')).toEqual([0, '•', '*The *reply is left'])
    expect(shape('  * nested item')).toEqual([2, '•', 'nested item'])
    expect(shape('2. Open the pane')).toEqual([0, '2.', 'Open the pane'])
    expect(shape('## What changed')).toEqual([0, '', '*What *changed'])
    expect(shape('> quoted')).toEqual([0, '│', 'quoted'])
    expect(shape('see `d703c9e` and [PR #47](https://x)')).toEqual([0, '', 'see d703c9e and PR #47'])
    expect(shape('-1 is not a list')).toEqual([0, '', '-1 is not a list'])
  })

  test('表：区切りの行を落とし、行はセルごとの語に。区切りの前の行（見出し）は語をすべて濃く', () => {
    const cells = (text: string) => WordLines.all(text).map(line => line.cells?.map(cell => cell.map(w => (w.isFixed ? `*${w.label}` : w.label)).join(' ')))
    expect(cells('| Line | Shown |\n|---|:---:|\n| `- ` | • kept |\nafter')).toEqual([['*Line', '*Shown'], ['-', '• kept'], undefined])
  })
})
