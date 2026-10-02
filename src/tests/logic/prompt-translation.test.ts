import { describe, expect, test } from 'claude-code/testing'

import { PromptTranslations } from '../../logic/prompt-translation/prompt-translation'

const on = { enabled: true, native: 'Japanese', target: 'English', model: 'haiku' }

describe('prompt-translation', () => {
  test('外国語版を作るのは、オンのときに自分で打った指示だけ', () => {
    // [オン, 送り元, 文面, 作るか]
    const rows = [
      [true, 'composer', 'ログ見て', true],
      [false, 'composer', 'ログ見て', false],
      [true, 'sdk', 'ログ見て', true],
      [true, 'bridge', 'ログ見て', true],
      [true, 'task-notification', 'ログ見て', false],
      [true, 'peer', 'ログ見て', false],
      [true, 'composer', '', false],
      [true, 'composer', '/clear', false],
      [true, 'composer', '/model sonnet', false],
      [true, 'composer', '/tmp/app.log を見て', true],
    ] as const
    for (const [enabled, from, text, wanted] of rows) {
      expect(PromptTranslations.request({ ...on, enabled }, from, text) !== undefined).toBe(wanted)
    }
  })

  test('訳を頼むのは、描く面があり、同じ文を今の言語の組でまだ訳せていないときだけ', () => {
    expect(PromptTranslations.isNeeded(['desktop'], 'ja>en')).toBe(true)
    expect(PromptTranslations.isNeeded([], 'ja>en')).toBe(false)
    expect(PromptTranslations.isNeeded(['terminal'], 'ja>en', { ok: true, value: 'Go on.', languages: 'ja>en' })).toBe(false)
    expect(PromptTranslations.isNeeded(['terminal'], 'ja>de', { ok: true, value: 'Go on.', languages: 'ja>en' })).toBe(true)
    expect(PromptTranslations.isNeeded(['terminal'], 'ja>en', { ok: false, error: { reason: 'empty-reply' }, languages: 'ja>en' })).toBe(true)
  })

  test('訳の行を出すのは、訳せていて、元の指示と違うときだけ', () => {
    expect(PromptTranslations.line('composer', 'ログ見て', { ok: true, value: 'Check the logs.' })).toEqual({ restated: 'Check the logs.', tips: [] })
    expect(PromptTranslations.line('composer', 'fix the test', { ok: true, value: 'fix the test' })).toBeUndefined()
    expect(PromptTranslations.line('composer', 'ok', { ok: true, value: 'Ok.' })).toBeUndefined()
    expect(PromptTranslations.line('composer', '<pasted_content id="1">Error: boom</pasted_content id="1">', { ok: true, value: '[…]' })).toBeUndefined()
    expect(PromptTranslations.line('composer', '- fix X\n- fix Y', { ok: true, value: '- fix X\n- fix Y' })).toBeUndefined()
    expect(PromptTranslations.line('composer', 'make the **title** bold', { ok: true, value: 'Make the title bold.' })).toBeUndefined()
    expect(PromptTranslations.line('composer', 'I dont know', { ok: true, value: "I don't know\n- 縮約形" })).toEqual({ restated: "I don't know", tips: ['縮約形'] })
    expect(PromptTranslations.line('composer', 'which file? just the path please', { ok: true, value: 'Which file? Just the path, please.' })).toBeUndefined()
    const value = 'Fix the failing test.\nThen open a PR.\n- 「that failing」→「the failing」\n- 「pls」→「please」'
    expect(PromptTranslations.line('composer', 'fix test that failing pls. then PR', { ok: true, value }))
      .toEqual({ restated: 'Fix the failing test. Then open a PR.', tips: ['「that failing」→「the failing」', '「pls」→「please」'] })
    expect(PromptTranslations.line('composer', 'ログ見て', { ok: false, error: { reason: 'empty-reply' } })).toBeUndefined()
    expect(PromptTranslations.line('composer', 'ログ見て')).toBeUndefined()
    expect(PromptTranslations.line('task-notification', 'ログ見て', { ok: true, value: 'Check the logs.' })).toBeUndefined()
  })

  test('貼り付けも含め、文面をそのまま送る（資料を省くのは訳す側に任せる）', () => {
    const text = 'これ何で落ちてる？\n<pasted_content id="1">\nError: boom\n</pasted_content id="1">'
    expect(PromptTranslations.request(on, 'composer', text)?.prompt).toBe(`<message>${text}</message>`)
  })

  test('返事が来れば訳文、来なければその失敗をそのまま持つ', () => {
    expect(PromptTranslations.of({ isAnswered: true, text: ' Check the logs. \n' })).toEqual({ ok: true, value: 'Check the logs.' })
    const failure = { isAnswered: false, reason: 'empty-reply' } as const
    expect(PromptTranslations.of(failure)).toEqual({ ok: false, error: failure })
  })

  test('呼び出し自体が拒まれたら、その message を持つ', () => {
    expect(PromptTranslations.of(new Error('model blocked'))).toEqual({ ok: false, error: { message: 'model blocked' } })
  })
})
