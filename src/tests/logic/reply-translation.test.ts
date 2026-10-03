import { describe, expect, test } from 'claude-code/testing'

import { ReplyTranslations } from '../../logic/reply-translation/reply-translation'

const settings = { enabled: true, card: true, native: 'Japanese', target: 'English', level: '', model: 'sonnet' }

describe('reply-translation', () => {
  test('訳は番号で段落に当て、欠けた番号とコードの段落は出さない。学ぶ言語から訳したら本文を読み、絵は出さない', () => {
    const text = 'one\n\n~~~\na\n\nb\n~~~\n\n    indented\n\ntwo\n\nthree'
    expect(ReplyTranslations.shown(settings, text, 'FROM: English\n[1] 一\n[1]: https://x\n[3] 二')).toEqual({
      translated: [{ text: 'one', restated: '一\n[1]: https://x', at: 0 }, { text: 'two', restated: '二', at: 3 }],
      spoken: ['one', 'two'],
      withCards: false,
    })
  })

  test('主な言語から訳したら訳を読み、単語の絵がオンなら訳の語から絵を出す', () => {
    expect(ReplyTranslations.shown(settings, 'いち', 'FROM: Japanese\n[1] one')).toEqual({ translated: [{ text: 'いち', restated: 'one', at: 0 }], spoken: ['one'], withCards: true })
    expect(ReplyTranslations.shown({ ...settings, card: false }, 'いち', 'FROM: Japanese\n[1] one').withCards).toBe(false)
  })

  test('訳を頼むのは、まだ頼んでいないか、訳せなかったとき', () => {
    expect(ReplyTranslations.isDue(undefined)).toBe(true)
    expect(ReplyTranslations.isDue({ ok: false, error: 'api-error' })).toBe(true)
    expect(ReplyTranslations.isDue(null)).toBe(false)
    expect(ReplyTranslations.isDue({ ok: true, value: '[1] one' })).toBe(false)
  })

  test('フェンスの外に文が残る段落は訳し、コードだけの返事は頼まない', () => {
    expect(ReplyTranslations.request(settings, 'Run:\n```\nls\n```')?.prompt).toBe('[1] Run:\n```\nls\n```')
    expect(ReplyTranslations.request(settings, '```\nls\n```')).toBeUndefined()
    expect(ReplyTranslations.request({ ...settings, enabled: false }, 'Run it.')).toBeUndefined()
  })
})
