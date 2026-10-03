import { describe, expect, test } from 'claude-code/testing'

import { DraftTranslations } from '../../logic/draft-translation/draft-translation'

const on = { enabled: true, live: true, native: 'Japanese', target: 'English', level: '', liveModel: 'haiku' }
const fixed = { ok: true, value: 'Please check why this test **is failing**.\n💡 is fail ではなく is failing\n! is fail' } as const

describe('draft-translation', () => {
  test('打ちかけを校正するのは、mod と入力中の校正がオンで、空でなく、コマンドの途中でもないとき', () => {
    // [mod, 入力中の校正, 打ちかけ, 校正するか]
    const rows = [
      [true, true, 'テストを', true],
      [false, true, 'テストを', false],
      [true, false, 'テストを', false],
      [true, true, '  ', false],
      [true, true, '/', false],
      [true, true, '/cl', false],
      [true, true, '/clear', false],
      [true, true, '/tmp を見て', true],
    ] as const
    for (const [enabled, live, draft, wanted] of rows) {
      expect(DraftTranslations.request({ ...on, enabled, live }, draft, ['clear']) !== undefined).toBe(wanted)
    }
  })

  test('頼み方は送信後と同じで、入力中の校正のモデルを使い、直した所も返させる', () => {
    const request = DraftTranslations.request(on, 'テストを ', [])
    expect(request?.model).toBe('haiku')
    expect(request?.prompt).toBe('<message>テストを</message>')
    expect(request?.system).toContain('"! "')
  })

  test('赤線も 💡 も一度に 1 つ。赤線は下書きの一番前の直す所', () => {
    const two = { ok: true, value: 'I **want to** know **why**.\n💡 want の後は to\n💡 文末は why\n! know why\n! want know' } as const
    expect(DraftTranslations.line(two)?.tips).toEqual(['want の後は to'])
    expect(DraftTranslations.marks('i want know why', two)).toEqual([{ start: 2, end: 11 }])
  })

  test('帯には "! " の行を出さず、赤線はその文字列が下書きに残っている所', () => {
    expect(DraftTranslations.line(fixed)).toEqual({ restated: 'Please check why this test **is failing**.', tips: ['is fail ではなく is failing'] })
    expect(DraftTranslations.marks('please check why this test is fail', fixed)).toEqual([{ start: 27, end: 34 }])
    expect(DraftTranslations.marks('please check why this test is failing now', { ok: true, value: 'x\n! is fale' })).toEqual([])
    expect(DraftTranslations.marks('x', { ok: false, error: 'api-error' })).toEqual([])
    expect(DraftTranslations.marks('this is fail', { ok: true, value: 'x\n! is' })).toEqual([{ start: 5, end: 7 }])
  })

  test('置き換えは、言い直しが違うときだけで、** は外し、改行・字下げ・空行・本文の "! " 行は保つ', () => {
    expect(DraftTranslations.replacement('please check why this test is fail', fixed)).toBe('Please check why this test is failing.')
    expect(DraftTranslations.replacement('Check the logs.', { ok: true, value: 'Check the logs.\n💡 自然です' })).toBeUndefined()
    expect(DraftTranslations.replacement('x', { ok: false, error: 'api-error' })).toBeUndefined()
    expect(DraftTranslations.replacement('見て\n// --- rules', { ok: true, value: 'Take a look\n// --- **rules**\n💡 x\n! rule' })).toBe('Take a look\n// --- rules')
    expect(DraftTranslations.replacement('見て\n\n  - a\n! b', { ok: true, value: 'Look\n\n  - a\n! b\n\n💡 x\n! Look' })).toBe('Look\n\n  - a\n! b')
  })
})
