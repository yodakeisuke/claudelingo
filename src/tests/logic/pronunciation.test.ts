import { describe, expect, test } from 'claude-code/testing'

import { Pronunciations } from '../../logic/pronunciation/pronunciation'

const answered = (text: string) => Pronunciations.of({ ok: true, value: text })

describe('pronunciation', () => {
  test('[n] の記号を文ごとに。[n] が / の中でも、番号が無くても読む', () => {
    expect(answered('[1] /tʃɛk/\n\n[2] /ðə lɔɡz/')).toEqual(['/tʃɛk/', '/ðə lɔɡz/'])
    expect(answered('/[1] kʊd juː lʊk/')).toEqual(['/kʊd juː lʊk/'])
    expect(answered('/tʃɛk ðə lɔɡz/')).toEqual(['/tʃɛk ðə lɔɡz/'])
    expect(answered('/tʃɛk/\n\n[1] /ˈtʃɛk/')).toEqual(['/ˈtʃɛk/'])
    expect(answered('sorry')).toBeUndefined()
  })
})
