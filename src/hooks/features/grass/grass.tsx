import type { EngineInterface, On } from 'claude-code'

import { Grass } from '../../../logic/grass/grass'
import { PromptTranslations } from '../../../logic/prompt-translation/prompt-translation'
import { Result } from '../../../logic/result/result'
import { TranslationSettings } from '../../../logic/translation-settings/translation-settings'

// 手順書「書いた語を数える」：送った指示の語数を、その日の分に足して残す。mod がオフなら数えず、残せなくても何も出さない
// 足す直前に読む（ほかのセッションも同じ所に足す）
const count = async ($: EngineInterface, text: string) => {
  if (!TranslationSettings.of(await $.store.get('settings')).enabled) return
  const today = Grass.day(await $.clock.now())
  await Result.given($.store.set('words', Grass.added(await $.store.get('words'), today, text)))
}

export const grass = (on: On) => {
  // 数えるのは自分で打った指示だけ。送信は待たせない
  on('prompt.submit', { origin: PromptTranslations.ownOrigins() }, ($, e, next) => {
    $.clock.after(0, () => void count($, e.text))
    return next(e)
  })
}
