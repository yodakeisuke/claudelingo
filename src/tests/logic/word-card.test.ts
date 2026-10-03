import { describe, expect, test } from 'claude-code/testing'

import { Completions } from '../../logic/completion/completion'
import { WordCards } from '../../logic/word-card/word-card'

const usage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }
const restated = "I'll **carry on** with the tests."
const answered = (text: string) => Completions.of(Promise.resolve({ isAnswered: true as const, text, usage }))
const reply = (unit: string) => answered(`UNIT: ${unit}\nPRON: /ˈkæri ɒn/\nCAPTION: 運び続ける\nSVG:\n<svg viewBox="0 0 480 288" width="480" height="288"><rect/></svg>`)

describe('word-card', () => {
  test('訳の行の語は、直した所の ** を外して見せ（中の語には印）、小文字の英字だけで渡す。記号だけの語は押せない', () => {
    expect(WordCards.words(restated)).toEqual([
      { label: "I'll", word: "i'll", isFixed: false }, { label: 'carry', word: 'carry', isFixed: true }, { label: 'on', word: 'on', isFixed: true },
      { label: 'with', word: 'with', isFixed: false }, { label: 'the', word: 'the', isFixed: false }, { label: 'tests.', word: 'tests', isFixed: false },
    ])
    expect(WordCards.words('Déjà vu, ça va ?').map(w => w.word)).toEqual(['déjà', 'vu', 'ça', 'va', ''])
    expect(WordCards.words('テストを直して').map(w => w.word)).toEqual(['テストを直して'])
    expect(WordCards.words('We’ll देखना ‘Hello’. \'bye\'').map(w => w.word)).toEqual(["we'll", 'देखना', 'hello', 'bye'])
    expect(WordCards.words('- fix `src/**/*.ts` and **use** it').map(w => [w.label, w.word, w.isFixed])).toEqual([['-', '', false], ['fix', 'fix', false], ['`src/**/*.ts`', 'srcts', false], ['and', 'and', false], ['use', 'use', true], ['it', 'it', false]])
    expect(WordCards.request({ native: 'Japanese', target: 'English', level: '', cardModel: 'sonnet' }, { word: 'carry', restated }, ['desktop']).prompt).toBe(`{"pressed":"carry","sentence":"I'll carry on with the tests."}`)
  })

  test('SVG は、絵を描ける面（端末のほか）があるときだけ頼む', () => {
    const settings = { native: 'Japanese', target: 'English', level: '', cardModel: 'sonnet' }
    expect(WordCards.request(settings, { word: 'carry', restated }, ['terminal']).system).not.toContain('SVG:')
    expect(WordCards.request(settings, { word: 'carry', restated }, ['terminal', 'desktop']).system).toContain('SVG:')
  })

  test('UNIT / CAPTION がそろい（SVG は無くてもよい）、句が押した語と関わるときだけ絵にする', async () => {
    const carry = { word: 'carry', restated }
    expect((WordCards.of(await answered('UNIT: carry on\nPRON: /x/\nCAPTION: 運び続ける'), carry))?.svg).toBe('')
    expect((WordCards.of(await reply('carry on'), carry))?.unit).toBe('carry on')
    expect((WordCards.of(await reply('test'), { word: 'tests', restated }))?.unit).toBe('test')
    expect((WordCards.of(await reply('test'), { word: 'tests', restated: 'Add tests and test it.' }))?.unit).toBe('test')
    expect(WordCards.of(await reply('carry on'), { word: 'tests', restated })).toBeUndefined()
    expect(WordCards.of(await answered('UNIT: carry on'), carry)).toBeUndefined()
    expect(WordCards.of({ ok: false, error: 'timeout' }, carry)).toBeUndefined()
  })

  test('描いた絵は句のどの語からも引け、幅は 380px（拡大で 560px）で左に寄せる', async () => {
    const card = (WordCards.of(await reply('carry on'), { word: 'carry', restated }))!
    const all = WordCards.saving(undefined, card, { word: 'carry', restated })
    expect(WordCards.saved(all, { word: 'on', restated })).toBe(card)
    expect(WordCards.saved(all, { word: 'on', restated: 'go on' })).toBeUndefined()
    expect(WordCards.picture(card.svg).source).toBe('<svg viewBox="0 0 480 288" width="380" height="228" preserveAspectRatio="xMinYMid meet"><rect/></svg>')
    expect(WordCards.picture(card.svg, true)).toMatchObject({ width: 560, height: 336 })
  })
})
