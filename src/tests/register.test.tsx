import { describe, expect, mock, test } from 'claude-code/testing'
import type { ModelCompleteResult, On, PromptOrigin, RenderSurface } from 'claude-code'

const composer: PromptOrigin = { kind: 'composer' }
const usage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

// エンジン役：返事は "EN: <入力>"、行はそのまま。fail で失敗の仕方を変える
const engine = (on: On, fail?: 'api-error' | 'reject', surfaces: RenderSurface[] = ['terminal'], saved?: object, isWritable = true) => {
  const clock = mock.clock(on)
  const store = new Map<string, unknown>(saved ? [['settings', saved]] : [])
  on('store.get', (_$, e) => ({ value: store.get(e.key) }))
  on('store.set', (_$, e) => {
    if (!isWritable) throw new Error('disk full')
    store.set(e.key, e.value)
    return { value: undefined }
  })
  on('session.surfaces', () => ({ value: surfaces }))
  const asked: string[] = []
  const models: string[] = []
  on('model.complete', (_$, e) => {
    const prompt = e.prompt.replace(/<\/?message>/g, '')
    asked.push(prompt)
    models.push(e.model)
    if (fail === 'reject') throw new Error('model blocked')
    const value: ModelCompleteResult = fail === 'api-error'
      ? { isAnswered: false, reason: 'api-error', status: 500, error: 'server_error', usage }
      : { isAnswered: true, text: `EN: ${prompt}`, usage }
    return { value }
  })
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  on('ui.render', { component: 'UserMessage' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>{e.props.text}</Text>
  })
  return { clock, asked, models, store }
}

const row = (text: string, origin: PromptOrigin = composer) =>
  ({ plugin: 'claudelingo', component: 'UserMessage', props: { text, origin, isExpanded: true } }) as const

const pane = { title: 'claudelingo', isFocused: true, bodyColumns: 80, placement: 'inline', scroll: { offset: 0, bodyRows: 7 }, view: {} } as const

describe('register', () => {
  test('-p など描く面がないときは訳さない', async ($, on) => {
    const { clock, asked } = engine(on, undefined, [])
    await $.prompt.submit({ text: 'ログ見て', wait: false, origin: { kind: 'sdk' } })
    await clock.advance(0)
    expect(asked).toEqual([])
  })

  test('直した所は太字で、アドバイスは1点ずつ出る', async ($, on) => {
    const { clock } = engine(on)
    await $.prompt.submit({ text: 'fix **tests**\n- each の後は単数', wait: false, origin: composer })
    await clock.advance(0)
    const ui = await $.ui.mount({ ...row('fix **tests**\n- each の後は単数'), surface: 'desktop' })
    expect(await ui.find({ type: 'Text', text: 'tests' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'each の後は単数' })).toBeDefined()
  })

  test('同じ文は訳し直さず、出ている訳も消えない', async ($, on) => {
    const { clock, asked } = engine(on)
    for (let i = 0; i < 2; i++) {
      await $.prompt.submit({ text: 'つづけて', wait: false, origin: composer })
      await clock.advance(0)
    }
    expect(asked).toEqual(['つづけて'])
  })

  test('自分の指示の下に訳が出る（どの面でも）', async ($, on) => {
    const { clock } = engine(on)
    await $.prompt.submit({ text: 'ログ見て', wait: false, origin: composer })
    await clock.advance(0)
    for (const surface of ['terminal', 'desktop'] as const) {
      const ui = await $.ui.mount({ ...row('ログ見て'), surface })
      expect(await ui.find({ type: 'Text', text: 'EN: ログ見て' })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: 'ログ見て' })).toBeDefined()
    }
  })

  test('送信は訳を待たない', async ($, on) => {
    const { asked } = engine(on)
    await $.prompt.submit({ text: 'ログ見て', wait: false, origin: composer })
    expect(asked).toHaveLength(0)
  })

  test('スラッシュコマンドと自分以外の送信は訳さない', async ($, on) => {
    const { clock, asked } = engine(on)
    await $.prompt.submit({ text: '/clear', wait: false, origin: composer })
    await $.prompt.submit({ text: 'done', wait: false, origin: { kind: 'task-notification' } })
    await clock.advance(0)
    expect(asked).toHaveLength(0)
  })

  test('訳ができるまでは何も足さない', async ($, on) => {
    engine(on)
    const ui = await $.ui.mount({ ...row('まだ'), surface: 'terminal' })
    expect(await ui.find({ type: 'Text', text: /↳/ })).toBeUndefined()
  })

  for (const fail of ['api-error', 'reject'] as const) {
    test(`訳に失敗（${fail}）しても何も足さず、送信も通る`, async ($, on) => {
      const { clock } = engine(on, fail)
      expect(await $.prompt.submit({ text: 'ログ見て', wait: false, origin: composer })).toEqual({ text: 'ログ見て' })
      await clock.advance(0)
      const ui = await $.ui.mount({ ...row('ログ見て'), surface: 'terminal' })
      expect(await ui.find({ type: 'Text', text: /↳/ })).toBeUndefined()
    })
  }

  test('無効の設定では訳さない', async ($, on) => {
    const { clock, asked } = engine(on, undefined, undefined, { enabled: false })
    await $.prompt.submit({ text: 'ログ見て', wait: false, origin: composer })
    await clock.advance(0)
    expect(asked).toHaveLength(0)
  })

  test('/lingo で設定パネルが開き、押す・入力するとすぐ保存され、選んだ方が強調される', async ($, on) => {
    const { store } = engine(on)
    const opened: string[] = []
    on('ui.open', (_$, e) => (opened.push(e.id), { value: { isPlaced: true } }))
    await $.command.run({ command: 'lingo', args: '', origin: composer, presentation: { isFullscreen: false, columns: 80 } })
    expect(opened).toEqual(['claudelingo'])
    for (const [surface, enabled, target, model] of [['terminal', false, 'Spanish', 'opus'], ['desktop', true, 'French', 'haiku']] as const) {
      const ui = await $.ui.mount({ plugin: 'claudelingo', surface, component: 'Pane', requestId: 'claudelingo', props: pane })
      await ui.press({ key: `enabled-${enabled ? 'on' : 'off'}` })
      // Enter を押さず、打っただけでも保存される
      await ui.input({ key: 'target', text: 'x', kind: 'change' })
      await ui.input({ key: 'target', text: target, kind: 'change' })
      await ui.press({ key: `model-${model}` })
      expect(store.get('settings')).toEqual({ enabled, native: 'Japanese', target, model })
      expect((await ui.find({ type: 'Button', key: `model-${model}` }))?.props.variant).toBe('primary')
      expect((await ui.find({ type: 'Button', key: `enabled-${enabled ? 'on' : 'off'}` }))?.props.variant).toBe('primary')
    }
  })

  test('設定を変えたら、同じ指示も訳し直す', async ($, on) => {
    const { clock, asked } = engine(on)
    const ui = await $.ui.mount({ plugin: 'claudelingo', surface: 'desktop', component: 'Pane', requestId: 'claudelingo', props: pane })
    for (const target of ['German', 'French']) {
      await ui.input({ key: 'target', text: target })
      await $.prompt.submit({ text: 'ログ見て', wait: false, origin: composer })
      await clock.advance(0)
    }
    expect(asked).toEqual(['ログ見て', 'ログ見て'])
  })

  test('選んだモデルが、次の訳から使われる', async ($, on) => {
    const { clock, models } = engine(on)
    const ui = await $.ui.mount({ plugin: 'claudelingo', surface: 'desktop', component: 'Pane', requestId: 'claudelingo', props: pane })
    await ui.press({ key: 'model-opus' })
    await $.prompt.submit({ text: 'ログ見て', wait: false, origin: composer })
    await clock.advance(0)
    expect(models).toEqual(['opus'])
  })

  test('設定の保存に失敗したら、選んだ値は示さず、理由を出す', async ($, on) => {
    engine(on, undefined, undefined, undefined, false)
    const ui = await $.ui.mount({ plugin: 'claudelingo', surface: 'desktop', component: 'Pane', requestId: 'claudelingo', props: pane })
    await ui.press({ key: 'model-opus' })
    expect(await ui.find({ type: 'Text', text: /保存できませんでした：.+/ })).toBeDefined()
    expect((await ui.find({ type: 'Button', key: 'model-opus' }))?.props.variant).toBe('secondary')
  })

  test('保存してある翻訳モデルで訳す', async ($, on) => {
    const { clock, models } = engine(on, undefined, undefined, { model: 'haiku' })
    await $.prompt.submit({ text: 'ログ見て', wait: false, origin: composer })
    await clock.advance(0)
    expect(models).toEqual(['haiku'])
  })
})
