import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { ModelCompleteResult, On, PromptOrigin, RenderSurface } from 'claude-code'

const composer: PromptOrigin = { kind: 'composer' }
const usage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

// エンジン役：返事は "EN: <入力>"、行はそのまま。fail で失敗の仕方を変える
const engine = (on: On, fail?: 'api-error' | 'reject', surfaces: RenderSurface[] = ['terminal'], saved?: object, isWritable = true, isFull = false) => {
  const clock = mock.clock(on)
  const store = new Map<string, unknown>(saved ? [['settings', saved]] : [])
  on('store.get', (_$, e) => ({ value: store.get(e.key) }))
  on('store.set', (_$, e) => {
    if (!isWritable) throw new Error('disk full')
    if (isFull && e.key === 'cards' && Object.keys(e.value as object).length > 2) throw new Error('over 4 MiB')
    store.set(e.key, e.value)
    return { value: undefined }
  })
  on('session.surfaces', () => ({ value: surfaces }))
  const asked: string[] = []
  const models: string[] = []
  on('model.complete', (_$, e) => {
    const prompt = e.prompt.replace(/<\/?message>/g, '')
    asked.push(prompt)
    if (prompt.startsWith('{"pressed"')) return { value: card(JSON.parse(prompt).pressed) }
    models.push(e.model)
    if (fail === 'reject') throw new Error('model blocked')
    const value: ModelCompleteResult = fail === 'api-error'
      ? { isAnswered: false, reason: 'api-error', status: 500, error: 'server_error', usage }
      : { isAnswered: true, text: `EN: ${prompt}`, usage }
    return { value }
  })
  on('command.list', () => ({ value: [{ name: 'clear', description: '', source: 'builtin' }] }))
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  on('ui.render', { component: 'UserMessage' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>{e.props.text}</Text>
  })
  return { clock, asked, models, store }
}

// 単語の絵の返事：carry と on は carry on、tests は文の別の句（迷子）、ほかはその語
const UNITS: Record<string, string> = { carry: 'carry on', on: 'carry on', tests: 'carry on' }
const card = (pressed: string): ModelCompleteResult => ({ isAnswered: true, text: `UNIT: ${UNITS[pressed] ?? pressed}\nCAPTION: ${pressed} の絵\nSVG:\n<svg viewBox="0 0 480 288" width="480"><rect/></svg>`, usage })

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
    const { clock } = engine(on, undefined, undefined, { card: false })
    await $.prompt.submit({ text: 'fix **tests**\n💡 each の後は単数', wait: false, origin: composer })
    await clock.advance(0)
    const ui = await $.ui.mount({ ...row('fix **tests**\n💡 each の後は単数'), surface: 'desktop' })
    expect(await ui.find({ type: 'Markdown', text: 'EN: fix **tests**' })).toBeDefined()
    expect(await ui.find({ type: 'Markdown', text: '💡 each の後は単数' })).toBeDefined()
  })

  test('自分の指示の下に訳が出る（どの面でも）', async ($, on) => {
    const { clock } = engine(on, undefined, undefined, { card: false })
    await $.prompt.submit({ text: 'ログ見て', wait: false, origin: composer })
    await clock.advance(0)
    for (const surface of ['terminal', 'desktop'] as const) {
      const ui = await $.ui.mount({ ...row('ログ見て'), surface })
      expect(await ui.find({ type: 'Markdown', text: 'EN: ログ見て' })).toBeDefined()
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
    expect(await ui.find({ type: 'Markdown' })).toBeUndefined()
  })

  for (const fail of ['api-error', 'reject'] as const) {
    test(`訳に失敗（${fail}）したら理由を出し、送信は通る`, async ($, on) => {
      const { clock } = engine(on, fail)
      expect(await $.prompt.submit({ text: 'ログ見て', wait: false, origin: composer })).toEqual({ text: 'ログ見て' })
      await clock.advance(0)
      const ui = await $.ui.mount({ ...row('ログ見て'), surface: 'terminal' })
      expect((await ui.find({ type: 'Markdown' }))?.props.text).toMatch(/^訳せませんでした：.+/)
    })
  }

  test('無効の設定では訳さない', async ($, on) => {
    const { clock, asked } = engine(on, undefined, undefined, { enabled: false })
    await $.prompt.submit({ text: 'ログ見て', wait: false, origin: composer })
    await clock.advance(0)
    expect(asked).toHaveLength(0)
  })

  test('/lingo で設定パネルが開き、押す・確定するとすぐ保存され、選んだ方が強調される', async ($, on) => {
    const { store } = engine(on)
    const opened: string[] = []
    on('ui.open', (_$, e) => (opened.push(e.id), { value: { isPlaced: true } }))
    await $.command.run({ command: 'lingo', args: '', origin: composer, presentation: { isFullscreen: false, columns: 80 } })
    expect(opened).toEqual(['claudelingo'])
    for (const [surface, enabled, target, model] of [['terminal', false, 'Spanish', 'opus'], ['desktop', true, 'French', 'haiku']] as const) {
      const ui = await $.ui.mount({ plugin: 'claudelingo', surface, component: 'Pane', requestId: 'claudelingo', props: pane })
      await ui.press({ key: `enabled-${enabled ? 'on' : 'off'}` })
      await ui.input({ key: 'target', text: target })
      await ui.press({ key: `model-${model}` })
      expect(store.get('settings')).toEqual({ enabled, native: 'Japanese', target, model, live: true, liveModel: 'sonnet', livePause: '0.5', card: true, cardModel: 'sonnet' })
      expect((await ui.find({ type: 'Button', key: `model-${model}` }))?.props.variant).toBe('primary')
      expect((await ui.find({ type: 'Button', key: `enabled-${enabled ? 'on' : 'off'}` }))?.props.variant).toBe('primary')
    }
  })

  test('言語を空欄で確定しても、初期値のまま', async ($, on) => {
    engine(on)
    const ui = await $.ui.mount({ plugin: 'claudelingo', surface: 'desktop', component: 'Pane', requestId: 'claudelingo', props: pane })
    await ui.input({ key: 'target', text: ' ' })
    expect((await ui.find({ type: 'Input', key: 'target' }))?.props.value).toBe('English')
  })

  test('無効にしても、モデルを変えても、出ている訳は消えない', async ($, on) => {
    const { clock } = engine(on, undefined, undefined, { card: false })
    await $.prompt.submit({ text: 'ログ見て', wait: false, origin: composer })
    await clock.advance(0)
    const ui = await $.ui.mount({ plugin: 'claudelingo', surface: 'desktop', component: 'Pane', requestId: 'claudelingo', props: pane })
    await ui.press({ key: 'model-opus' })
    await ui.press({ key: 'enabled-off' })
    const message = await $.ui.mount({ ...row('ログ見て'), surface: 'desktop' })
    expect(await message.find({ type: 'Markdown', text: 'EN: ログ見て' })).toBeDefined()
  })

  test('同じ指示も、送るたびに今の設定で訳す', async ($, on) => {
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
  const sent = async ($: Engine, clock: ReturnType<typeof mock.clock>, surface: RenderSurface = 'desktop') => {
    await $.prompt.submit({ text: 'fix the tests and carry on', wait: false, origin: composer })
    await clock.advance(0)
    return $.ui.mount({ ...row('fix the tests and carry on'), surface })
  }

  test('訳の行の語を押すとその句の絵が出て、句のどの語を押しても閉じ、二度目は描き直さない', async ($, on) => {
    const { clock, asked } = engine(on)
    const ui = await sent($, clock)
    await ui.press({ key: 'word-5' })
    expect(await ui.find({ type: 'Text', text: 'carry on' })).toBeDefined()
    expect((await ui.find({ type: 'Svg' }))?.props.width).toBe(380)
    expect(await ui.find({ type: 'Text', text: 'carry の絵' })).toBeDefined()
    await ui.press({ key: 'word-6' })
    expect(await ui.find({ type: 'Svg' })).toBeUndefined()
    await ui.press({ key: 'word-6' })
    expect(await ui.find({ type: 'Svg' })).toBeDefined()
    expect(asked).toEqual(['fix the tests and carry on', '{"pressed":"carry","sentence":"EN: fix the tests and carry on"}'])
  })

  test('別の語の絵は並んで出て、拡大・縮小はその絵だけ', async ($, on) => {
    const { clock } = engine(on)
    const ui = await sent($, clock)
    await ui.press({ key: 'word-1' })
    await ui.press({ key: 'word-5' })
    expect(await ui.findAll({ type: 'Svg' })).toHaveLength(2)
    await ui.press({ key: 'resize-carry' })
    expect((await ui.findAll({ type: 'Svg' })).map(s => s.props.width)).toEqual([380, 560])
    expect((await ui.find({ type: 'Button', key: 'resize-carry' }))?.props.label).toBe('縮小')
    await ui.press({ key: 'resize-carry' })
    expect((await ui.findAll({ type: 'Svg' })).map(s => s.props.width)).toEqual([380, 380])
  })

  test('保存領域があふれたら、それまでの絵を捨てて今の絵だけ残す', async ($, on) => {
    const { clock, store } = engine(on, undefined, undefined, undefined, true, true)
    const ui = await sent($, clock)
    await ui.press({ key: 'word-1' })
    await ui.press({ key: 'word-5' })
    expect(Object.keys(store.get('cards') as object)).toEqual(['carry|EN: fix the tests and carry on', 'on|EN: fix the tests and carry on'])
  })

  test('押した語と関わらない句が返ったら、描けなかったと出す', async ($, on) => {
    const { clock } = engine(on)
    const ui = await sent($, clock)
    await ui.press({ key: 'word-3' })
    expect(await ui.find({ type: 'Text', text: '描けませんでした：tests' })).toBeDefined()
  })

  test('端末では語の間に空白を挟み、絵の代わりに句と一文を出す', async ($, on) => {
    const { clock } = engine(on)
    const ui = await sent($, clock, 'terminal')
    expect(await ui.findAll({ type: 'Text', text: /^ $/ })).toHaveLength(6)
    await ui.press({ key: 'word-5' })
    expect(await ui.find({ type: 'Text', text: 'carry の絵' })).toBeDefined()
    expect(await ui.find({ type: 'Svg' })).toBeUndefined()
    expect(await ui.find({ type: 'Button', key: 'resize-carry' })).toBeUndefined()
  })

  test('単語の絵を無効にすると、訳の行は今までどおり文で出る', async ($, on) => {
    const { clock } = engine(on, undefined, undefined, { card: false })
    const ui = await sent($, clock)
    expect(await ui.find({ type: 'Markdown', text: 'EN: fix the tests and carry on' })).toBeDefined()
    expect(await ui.find({ type: 'Button', key: 'word-0' })).toBeUndefined()
  })
})
