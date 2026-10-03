import { describe, expect, test } from 'claude-code/testing'

import { Completions } from '../../logic/completion/completion'

describe('completion', () => {
  test('返事が来れば頭の下書きと囲みのタグを捨てた文面（文面の中のタグは残す）、来なければその理由を持つ', async () => {
    expect(await Completions.of(Promise.resolve({ isAnswered: true, text: ' Check the logs. \n' }))).toEqual({ ok: true, value: 'Check the logs.' })
    expect(await Completions.of(Promise.resolve({ isAnswered: true, text: '<reasoning>needs fixing</reasoning>I want to know why.' }))).toEqual({ ok: true, value: 'I want to know why.' })
    expect(await Completions.of(Promise.resolve({ isAnswered: true, text: '<message>fix the <button> styling</message>' }))).toEqual({ ok: true, value: 'fix the <button> styling' })
    expect(await Completions.of(Promise.resolve({ isAnswered: true, text: '<message>I want to know why.</message>' }))).toEqual({ ok: true, value: 'I want to know why.' })
    expect(await Completions.of(Promise.resolve({ isAnswered: true, text: 'Remove the <message> tag and the <think> block.' }))).toEqual({ ok: true, value: 'Remove the <message> tag and the <think> block.' })
    expect(await Completions.of(Promise.resolve({ isAnswered: true, text: '<message>Send:\n<message>\nhi\n</message></message>\n💡 tip' }))).toEqual({ ok: true, value: 'Send:\n<message>\nhi\n</message>\n💡 tip' })
    expect(await Completions.of(Promise.resolve({ isAnswered: false, reason: 'empty-reply' }))).toEqual({ ok: false, error: 'empty-reply' })
    expect(await Completions.of(Promise.reject(new Error('model blocked')))).toEqual({ ok: false, error: 'model blocked' })
  })
})
