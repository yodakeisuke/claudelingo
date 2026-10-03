import { describe, expect, test } from 'claude-code/testing'

import { ReplyTranslations } from '../../logic/reply-translation/reply-translation'

const settings = { native: 'Japanese', target: 'English', level: '', model: 'sonnet' }

describe('reply-translation', () => {
  test('訳は番号で段落に当て、欠けた番号とコードの段落には無い。学ぶ言語へ訳したかは FROM が主な言語か', () => {
    const text = 'one\n\n~~~\na\n\nb\n~~~\n\n    indented\n\ntwo\n\nthree'
    expect(ReplyTranslations.shown(settings, text, 'FROM: English\n[1] 一\n[1]: https://x\n[3] 二')).toEqual({
      paragraphs: [{ text: 'one', translation: '一\n[1]: https://x' }, { text: '~~~\na\n\nb\n~~~', translation: undefined }, { text: '    indented', translation: undefined }, { text: 'two', translation: '二' }, { text: 'three', translation: undefined }],
      isIntoTarget: false,
    })
  })

  test('フェンスの外に文が残る段落は訳し、コードだけの返事は頼まない', () => {
    expect(ReplyTranslations.request(settings, 'Run:\n```\nls\n```')?.prompt).toBe('[1] Run:\n```\nls\n```')
    expect(ReplyTranslations.request(settings, '```\nls\n```')).toBeUndefined()
  })
})
