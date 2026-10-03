import { describe, expect, test } from 'claude-code/testing'

import { WordAspects } from '../../logic/word-aspect/word-aspect'

const usage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }
const answered = (text: string) => Promise.resolve({ isAnswered: true as const, text, usage })

describe('word-aspect', () => {
  test('文の ** を外し、絵と同じ形の入力で頼む', () => {
    const request = WordAspects.request({ native: 'Japanese', target: 'English', model: 'haiku' }, 'similar', { word: 'carry', restated: "I'll **carry on**." })
    expect(request.prompt).toBe(`{"pressed":"carry","sentence":"I'll carry on."}`)
    expect(request.model).toBe('haiku')
    expect(request.system).toContain('ALT: <expression>')
  })

  test('本文の行で項目を始め、添える行はその下に。ほかの行と、項目より前の添える行は捨てる', async () => {
    const reply = answered('FEEL: 迷子\nEX: Please carry on.\nTR: どうぞ続けて。\nFEEL: 止めたのはこっち\nnote\nEX: She carried on.\nUSE: 別の欄')
    expect(await WordAspects.of(reply, 'examples')).toEqual([
      { text: 'Please carry on.', notes: ['どうぞ続けて。', '止めたのはこっち'] },
      { text: 'She carried on.', notes: [] },
    ])
  })

  test('項目が無いか、答えが無ければ書けなかったとする', async () => {
    expect(await WordAspects.of(answered('EX: Please carry on.'), 'origin')).toBeUndefined()
    expect(await WordAspects.of(Promise.resolve({ isAnswered: false as const, reason: 'timeout' }), 'origin')).toBeUndefined()
    expect(await WordAspects.of(Promise.reject(new Error('blocked')), 'origin')).toBeUndefined()
  })
})
