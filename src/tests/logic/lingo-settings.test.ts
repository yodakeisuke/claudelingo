import { describe, expect, test } from 'claude-code/testing'

import { LingoSettings } from '../../logic/lingo-settings/lingo-settings'

describe('lingo-settings', () => {
  test('保存が無ければ初期値、あれば保存した項目だけ初期値に重ねる', () => {
    expect(LingoSettings.of(undefined)).toEqual({ enabled: true, native: 'Japanese', target: 'English', level: '', model: 'sonnet', afterSend: true, live: true, liveModel: 'haiku', livePause: '1.5', card: true, cardModel: 'opus', voice: 'Samantha' })
    expect(LingoSettings.of({ target: 'Spanish', live: false })).toMatchObject({ native: 'Japanese', target: 'Spanish', live: false, liveModel: 'haiku' })
  })
})
