import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

// 指示の文面 → 学ぶ言語での言い方
const translations = atom({ plugin: 'claudelingo', key: 'translations' } as const, {})
// このセッションだけ止める
const isOff = atom({ plugin: 'claudelingo', key: 'isOff' } as const, false)

const system = (native: string, target: string) =>
  `The user is a ${native} speaker learning ${target}. Rewrite their message to an AI assistant as one natural ${target} message, the way a fluent speaker would write it, keeping its meaning and tone. Leave out long pasted content (logs, code, file contents) and translate only the user's own words. Reply with the ${target} text only.`

export const register: Register = (on, options) => {
  const native = String(options.native)
  const target = String(options.target)
  const model = String(options.model)

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'lingo', description: '外国語版の表示をオン/オフ', immediate: true })
    return next(e)
  })

  on('command.run', { command: 'lingo' }, async $ => {
    const off = await update($, isOff, was => !was)
    return { text: off ? '外国語版：オフ' : '外国語版：オン' }
  })

  on('prompt.submit', async ($, e, next) => {
    const text = e.text.trim()
    if (e.origin.kind === 'composer' && text && !text.startsWith('/') && !(await read($, isOff))) {
      // 送信は待たせない。訳は自分の dispatch で走らせる
      $.clock.after(0, async () => {
        const r = await $.model.complete({ model, system: system(native, target), prompt: text })
        if (r.isAnswered) await update($, translations, all => ({ ...all, [text]: r.text.trim() }))
        else $.ui.log(`translation failed: ${r.reason}`, { to: 'debug' })
      })
    }
    return next(e)
  })

  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    const row = await next(e)
    const translation = e.props.origin.kind === 'composer' ? (await read($, translations))[e.props.text.trim()] : undefined
    if (!translation) return row
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        {row}
        <Text dimColor>  ↳ {translation}</Text>
      </Box>
    )
  })
}
