import { describe, expect, test } from 'claude-code/testing'

import { WordCards } from '../../logic/word-card/word-card'

const usage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }
const restated = "I'll **carry on** with the tests."
const answered = (text: string) => Promise.resolve({ isAnswered: true as const, text, usage })
const reply = (unit: string) => answered(`UNIT: ${unit}\nCAPTION: 運び続ける\nSVG:\n<svg viewBox="0 0 480 288" width="480" height="288"><rect/></svg>`)

describe('word-card', () => {
  test('訳の行の語は、** を外して見せ、小文字の英字だけで渡す', () => {
    expect(WordCards.words(restated)).toEqual([
      { label: "I'll", word: "i'll" }, { label: 'carry', word: 'carry' }, { label: 'on', word: 'on' },
      { label: 'with', word: 'with' }, { label: 'the', word: 'the' }, { label: 'tests.', word: 'tests' },
    ])
    expect(WordCards.words('Déjà vu, ça va ?').map(w => w.word)).toEqual(['déjà', 'vu', 'ça', 'va', ''])
    expect(WordCards.words('Retry 3 times (v2).').map(w => w.word)).toEqual(['retry', '', 'times', 'v2'])
    expect(WordCards.words('テストを直して').map(w => w.word)).toEqual(['テストを直して'])
    expect(WordCards.request({ native: 'Japanese', target: 'English', cardModel: 'sonnet' }, 'carry', restated).prompt).toBe(`{"pressed":"carry","sentence":"I'll carry on with the tests."}`)
  })

  test('UNIT / CAPTION / SVG がそろい、句が押した語と関わるときだけ絵にする', async () => {
    const carry = { word: 'carry', restated }
    expect((await WordCards.of(reply('carry on'), carry))?.unit).toBe('carry on')
    expect((await WordCards.of(reply('test'), { word: 'tests', restated }))?.unit).toBe('test')
    expect(await WordCards.of(reply('carry on'), { word: 'tests', restated })).toBeUndefined()
    expect(await WordCards.of(answered('UNIT: carry on'), carry)).toBeUndefined()
    expect(await WordCards.of(Promise.resolve({ isAnswered: false as const, reason: 'timeout' }), carry)).toBeUndefined()
    expect(await WordCards.of(Promise.reject(new Error('blocked')), carry)).toBeUndefined()
  })

  test('描いた絵は句のどの語からも引け、幅は 380px（拡大で 560px）で左に寄せる', async () => {
    const card = (await WordCards.of(reply('carry on'), { word: 'carry', restated }))!
    const all = WordCards.saving(undefined, card, { word: 'carry', restated })
    expect(WordCards.saved(all, { word: 'on', restated })).toBe(card)
    expect(WordCards.saved(all, { word: 'on', restated: 'go on' })).toBeUndefined()
    expect(WordCards.picture(card.svg).source).toBe('<svg viewBox="0 0 480 288" width="380" height="228" preserveAspectRatio="xMinYMid meet"><rect/></svg>')
    expect(WordCards.picture(card.svg, true)).toMatchObject({ width: 560, height: 336 })
  })
})
