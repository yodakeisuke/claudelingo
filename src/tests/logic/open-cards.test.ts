import { describe, expect, test } from 'claude-code/testing'

import { OpenCards } from '../../logic/open-cards/open-cards'

const card = { unit: 'carry on', pron: '/x/', caption: '運び続ける', svg: '' }

describe('open-cards', () => {
  test('閉じて開き直した後に先の依頼の失敗が届いても、出ている絵と項目は消さない', () => {
    expect(OpenCards.drawn([{ word: 'carry', card }], 'carry')).toEqual([{ word: 'carry', card }])
    const opened = [{ word: 'carry', card, aspects: { examples: { items: [{ text: 'Carry on.', notes: [] }] } } }]
    expect(OpenCards.written(opened, { word: 'carry', aspect: 'examples' })).toEqual(opened)
  })
})
