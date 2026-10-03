import { describe, expect, test } from 'claude-code/testing'

import { Pronunciations } from '../../logic/pronunciation/pronunciation'

const usage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }
const answered = (text: string) => Pronunciations.of(Promise.resolve({ isAnswered: true as const, text, usage }))

describe('pronunciation', () => {
  test('[n] の記号を文ごとに。[n] が / の中でも、番号が無くても読む', async () => {
    expect(await answered('[1] /tʃɛk/\n\n[2] /ðə lɔɡz/')).toEqual(['/tʃɛk/', '/ðə lɔɡz/'])
    expect(await answered('/[1] kʊd juː lʊk/')).toEqual(['/kʊd juː lʊk/'])
    expect(await answered('/tʃɛk ðə lɔɡz/')).toEqual(['/tʃɛk ðə lɔɡz/'])
    expect(await answered('/tʃɛk/\n\n[1] /ˈtʃɛk/')).toEqual(['/ˈtʃɛk/'])
    expect(await answered('sorry')).toBeUndefined()
  })
})
