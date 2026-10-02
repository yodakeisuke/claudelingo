import { describe, expect, mock, test } from 'claude-code/testing'
import type { ModelCompleteResult, On, PromptOrigin, RenderSurface } from 'claude-code'

const composer: PromptOrigin = { kind: 'composer' }
const usage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

// エンジン役：返事は "EN: <入力>"、行はそのまま。fail で失敗の仕方を変える
const engine = (on: On, fail?: 'api-error' | 'reject', surfaces: RenderSurface[] = ['terminal']) => {
  const clock = mock.clock(on)
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
  return { clock, asked, models }
}

const row = (text: string, origin: PromptOrigin = composer) =>
  ({ plugin: 'claudelingo', component: 'UserMessage', props: { text, origin, isExpanded: true } }) as const

describe('register', () => {
  test('-p など描く面がないときは訳さない', async ($, on) => {
    const { clock, asked } = engine(on, undefined, [])
    await $.prompt.submit({ text: 'ログ見て', wait: false, origin: { kind: 'sdk' } })
    await clock.advance(0)
    expect(asked).toEqual([])
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

  test('オフの設定では訳さない', { options: { enabled: false } }, async ($, on) => {
    const { clock, asked } = engine(on)
    await $.prompt.submit({ text: 'ログ見て', wait: false, origin: composer })
    await clock.advance(0)
    expect(asked).toHaveLength(0)
  })

  test('/lingo で設定パネルが開き、選ぶ・入力するとすぐ設定に書く', async ($, on) => {
    engine(on)
    const opened: string[] = []
    const set: unknown[] = []
    on('ui.open', (_$, e) => (opened.push(e.id), { value: { isPlaced: true } }))
    on('config.set', (_$, e) => (set.push([e.key, e.value]), { value: e.value }))
    await $.command.run({ command: 'lingo', args: '', origin: composer, presentation: { isFullscreen: false, columns: 80 } })
    expect(opened).toEqual(['claudelingo'])
    const pane = { title: 'claudelingo', isFocused: true, bodyColumns: 80, placement: 'inline', scroll: { offset: 0, bodyRows: 7 }, view: {} } as const
    for (const surface of ['terminal', 'desktop'] as const) {
      set.length = 0
      const ui = await $.ui.mount({ plugin: 'claudelingo', surface, component: 'Pane', requestId: 'claudelingo', props: pane })
      await ui.select({ key: 'enabled', value: 'off' })
      await ui.input({ key: 'target', text: 'Spanish' })
      await ui.select({ key: 'model', value: 'sonnet' })
      expect(set).toEqual([['claudelingo.enabled', false], ['claudelingo.target', 'Spanish'], ['claudelingo.model', 'sonnet']])
    }
  })

  test('設定は Claude 本体の /config に並べない', async ($, on) => {
    on('config.describe', (_$, e) => ({ label: e.label, isHidden: e.isHidden }))
    const describe = (key: string) => $.config.describe({ key, label: key, isHidden: false, provider: { plugin: 'engine', tier: 'builtin' } })
    expect((await describe('claudelingo.model')).isHidden).toBe(true)
    expect((await describe('theme')).isHidden).toBe(false)
  })

  test('設定の保存が拒否されたら、パネルに理由を出す', async ($, on) => {
    engine(on)
    on('config.set', () => ({ deny: 'policy' }))
    const pane = { title: 'claudelingo', isFocused: true, bodyColumns: 80, placement: 'inline', scroll: { offset: 0, bodyRows: 7 }, view: {} } as const
    const ui = await $.ui.mount({ plugin: 'claudelingo', surface: 'desktop', component: 'Pane', requestId: 'claudelingo', props: pane })
    await ui.select({ key: 'model', value: 'opus' })
    expect(await ui.find({ type: 'Text', text: '保存できませんでした：policy' })).toBeDefined()
  })

  test('翻訳モデルを設定で変えられる', { options: { model: 'sonnet' } }, async ($, on) => {
    const { clock, models } = engine(on)
    await $.prompt.submit({ text: 'ログ見て', wait: false, origin: composer })
    await clock.advance(0)
    expect(models).toEqual(['sonnet'])
  })
})
