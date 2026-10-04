import { describe, expect, test } from 'claude-code/testing'

import { OpenCards } from '../../logic/open-cards/open-cards'

const card = { unit: 'carry on', pron: '/x/', caption: '運び続ける', svg: '' }

describe('open-cards', () => {
  test('閉じて開き直した後に先の依頼の失敗が届いても、出ている絵と項目は消さない', () => {
    expect(OpenCards.drawn([{ word: 'carry', card }], 'carry')).toEqual([{ word: 'carry', card }])
    const opened = [{ word: 'carry', card, aspects: { examples: { items: [{ text: 'Carry on.', notes: [] }] } } }]
    expect(OpenCards.written(opened, { word: 'carry', aspect: 'examples' })).toEqual(opened)
  })

  test('届いた項目は 1 つ目から出し、1 つずつ足す。閉じた欄には足さない', () => {
    const at = { word: 'carry', aspect: 'examples' } as const
    const items = [{ text: 'Carry on.', notes: [] }, { text: 'Go on.', notes: [] }]
    const written = OpenCards.written(OpenCards.aspectPressed([{ word: 'carry', card }], at), at, items)
    expect(written[0]?.aspects?.examples?.shown).toBe(1)
    expect(OpenCards.revealed(written, at)[0]?.aspects?.examples?.shown).toBe(2)
    expect(OpenCards.revealed([{ word: 'carry', card }], at)[0]?.aspects?.examples).toBeUndefined()
  })
})
