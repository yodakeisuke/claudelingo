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
      [true, 'composer', '/tmp/app.log を見て', true],
      [true, 'composer', '/clear', false],
      [true, 'composer', '/model sonnet', false],
      [true, 'composer', '/spec-usecase-as-sop 価値2', false],
      [true, 'composer', '/nosuchcmd です', true],
      [true, 'composer', '/tmp を見て', true],
      [true, 'composer', '/README.md を確認して', true],
    ] as const
    for (const [enabled, from, text, wanted] of rows) {
      expect(PromptTranslations.request({ ...on, enabled }, { from, text }, ['clear', 'model', 'spec-usecase-as-sop']) !== undefined).toBe(wanted)
    }
  })

  test('訳を頼むのは、描く面があるときだけ', () => {
    expect(PromptTranslations.isNeeded(['desktop'])).toBe(true)
    expect(PromptTranslations.isNeeded([])).toBe(false)
  })

  test('訳せていれば言い直しとアドバイスに分け、訳せなかったら理由を出す', () => {
    expect(PromptTranslations.line({ ok: true, value: 'Check the logs.' })).toEqual({ restated: 'Check the logs.', tips: [] })
    const value = 'Fix the failing test.\nThen open a PR.\n💡 「that failing」→「the failing」\n💡 「pls」→「please」'
    expect(PromptTranslations.line({ ok: true, value }))
      .toEqual({ restated: 'Fix the failing test. Then open a PR.', tips: ['「that failing」→「the failing」', '「pls」→「please」'] })
    expect(PromptTranslations.line({ ok: true, value: 'Do this:\n- run tests\n💡 自然です' })).toEqual({ restated: 'Do this: - run tests', tips: ['自然です'] })
    expect(PromptTranslations.line({ ok: false, error: 'empty-reply' })).toEqual({ restated: '訳せませんでした：empty-reply', tips: [] })
    expect(PromptTranslations.line()).toBeUndefined()
  })

  test('貼り付けも含め、文面をそのまま送る', () => {
    const text = 'これ何で落ちてる？\n<pasted_content id="1">\nError: boom\n</pasted_content id="1">'
    expect(PromptTranslations.request(on, { from: 'composer', text }, [])?.prompt).toBe(`<message>${text}</message>`)
  })

  test('訳を引く鍵は、貼り付けの印があってもなくても同じ', () => {
    expect(PromptTranslations.key('これ見て\n<pasted_content id="1">\nError: boom\n</pasted_content id="1">')).toBe(PromptTranslations.key('これ見て\nError: boom'))
  })

  test('返事が来れば訳文、来なければその理由を持つ', () => {
    expect(PromptTranslations.of({ isAnswered: true, text: ' Check the logs. \n' })).toEqual({ ok: true, value: 'Check the logs.' })
    expect(PromptTranslations.of({ isAnswered: true, text: '<reasoning>needs fixing</reasoning>I want to know why.' })).toEqual({ ok: true, value: 'I want to know why.' })
    expect(PromptTranslations.of({ isAnswered: true, text: '<message>fix the <button> styling</message>' })).toEqual({ ok: true, value: 'fix the <button> styling' })
    expect(PromptTranslations.of({ isAnswered: true, text: '<message>I want to know why.</message>' })).toEqual({ ok: true, value: 'I want to know why.' })
    expect(PromptTranslations.of({ isAnswered: false, reason: 'empty-reply' })).toEqual({ ok: false, error: 'empty-reply' })
    expect(PromptTranslations.of(new Error('model blocked'))).toEqual({ ok: false, error: 'model blocked' })
  })
})
