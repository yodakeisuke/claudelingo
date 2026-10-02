import { atom, read, update } from 'claude-code'
import type { EngineInterface, ModelCompleteRequest, Register } from 'claude-code'

import type { ForeignVersion } from '../types'

// 指示の文面 → その外国語版
const versions = atom({ plugin: 'claudelingo', key: 'versions' } as const, {})

// 設定の保存が拒否されたときの理由（パネルに出す）
const denied = atom({ plugin: 'claudelingo', key: 'denied' } as const, '')

const PANE = 'claudelingo'
const MODELS = ['haiku', 'sonnet', 'opus']

const system = (native: string, target: string) =>
  `The user is a ${native} speaker learning ${target}. Rewrite their message to an AI assistant as one natural ${target} message, the way a fluent speaker would write it, keeping its meaning and tone. Leave out long pasted content (logs, code, file contents) and translate only the user's own words. Reply with the ${target} text only.`

async function translate($: EngineInterface, request: ModelCompleteRequest): Promise<ForeignVersion> {
  try {
    const r = await $.model.complete(request)
    return r.isAnswered ? { ok: true, value: r.text.trim() } : { ok: false, error: r }
  } catch (error) {
    return { ok: false, error: { message: String(error) } }
  }
}

export const register: Register = (on, options) => {
  const native = String(options.native)
  const target = String(options.target)
  const model = String(options.model)
  const enabled = options.enabled === true

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'lingo', description: 'claudelingo の設定を開く', immediate: true })
    return next(e)
  })

  on('command.run', { command: 'lingo' }, async $ => {
    await $.ui.open({ id: PANE, title: 'claudelingo', focus: true, closeOnEscape: true, holdToasts: true, rows: 7 })
    return {}
  })

  // 値は userConfig に書く。変わると module が新しい options で読み直され、パネルも描き直る
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    if (e.surface === 'mobile') {
      const { Text } = $.ui.resolve(e)
      return <Text dimColor>設定は Desktop か CLI で開いてください</Text>
    }
    const { Box, Text, Select, Input } = $.ui.resolve(e)
    const reason = await read($, denied)
    const set = async (field: string, value: string | boolean) => {
      const r = await $.config.set({ key: `claudelingo.${field}`, value })
      await update($, denied, () => r.deny ?? '')
    }
    return (
      <Box flexDirection="column">
        <Text bold>claudelingo</Text>
        <Select key="enabled" label="外国語版" value={enabled ? 'on' : 'off'} options={[{ value: 'on', label: 'オン' }, { value: 'off', label: 'オフ' }]} onSelect={v => set('enabled', v === 'on')} />
        <Input key="native" label="母語" value={native} onSubmit={v => set('native', v.trim() || native)} />
        <Input key="target" label="学ぶ言語" value={target} onSubmit={v => set('target', v.trim() || target)} />
        <Select key="model" label="翻訳モデル" value={model} options={MODELS.map(value => ({ value }))} onSelect={v => set('model', v)} />
        {reason && <Text color="red">保存できませんでした：{reason}</Text>}
        <Text dimColor>変更はすぐ反映 · Esc で閉じる</Text>
      </Box>
    )
  })

  on('prompt.submit', ($, e, next) => {
    const text = e.text.trim()
    if (e.origin.kind === 'composer' && text && !text.startsWith('/') && enabled) {
      // 送信は待たせない。訳は自分の dispatch で走らせる
      $.clock.after(0, async () => {
        const version = await translate($, { model, system: system(native, target), prompt: text, timeoutMs: 30_000 })
        await update($, versions, all => ({ ...all, [text]: version }))
        // エラーは画面に出さず、デバッグログに1行だけ
        if (!version.ok) $.ui.log(`translation failed: ${JSON.stringify(version.error)}`, { to: 'debug' })
      })
    }
    return next(e)
  })

  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    const row = await next(e)
    const version = e.props.origin.kind === 'composer' ? (await read($, versions))[e.props.text.trim()] : undefined
    if (!version?.ok) return row
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        {row}
        <Text dimColor>  ↳ {version.value}</Text>
      </Box>
    )
  })
}
