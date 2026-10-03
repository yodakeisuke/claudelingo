import { describe, expect, test } from 'claude-code/testing'

import { ReplyTranslations } from '../../logic/reply-translation/reply-translation'

describe('reply-translation', () => {
  test('学ぶ言語でない方へ訳すかは返事の INTO で、訳は段落の順に当て、欠けた段落とコードには無い', () => {
    const text = 'one\n\n```\na\n\nb\n```\n\ntwo\n\nthree'
    expect(ReplyTranslations.shown(text, { ok: true, value: 'INTO: NATIVE\n[1] 一\n[2] 二' })).toEqual({
      paragraphs: [{ text: 'one', translation: '一' }, { text: '```\na\n\nb\n```', translation: undefined }, { text: 'two', translation: '二' }, { text: 'three', translation: undefined }],
      isIntoTarget: false,
      error: '',
    })
    expect(ReplyTranslations.shown('one', { ok: false, error: 'timeout' })).toEqual({ paragraphs: [{ text: 'one', translation: undefined }], isIntoTarget: false, error: 'timeout' })
  })
})
