import { describe, expect, test } from 'claude-code/testing'

import { Restatements } from '../../logic/restatement/restatement'

describe('restatement', () => {
  test('直した所は ** の対だけ。対にならない ** は文字のまま残す', () => {
    expect(Restatements.parts('Lint `src/**/*.ts` and **use** it')).toEqual(['Lint `src/**/*.ts` and ', 'use', ' it'])
    expect(Restatements.plain('I **carry on** with 2**10.')).toBe('I carry on with 2**10.')
  })
})
