import { expect, mock, test } from 'claude-code/testing'
import type { On, PromptOrigin } from 'claude-code'

const composer: PromptOrigin = { kind: 'composer' }
const usage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

// エンジン役：返事は "EN: <入力>"、行はそのまま
const engine = (on: On) => {
  const clock = mock.clock(on)
  const asked: string[] = []
  const models: string[] = []
  on('model.complete', (_$, e) => (asked.push(e.prompt), models.push(e.model), { value: { isAnswered: true, text: `EN: ${e.prompt}`, usage } }))
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  on('ui.render', { component: 'UserMessage' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>{e.props.text}</Text>
  })
  return { clock, asked, models }
}

const row = (text: string, origin: PromptOrigin = composer) =>
  ({ plugin: 'claudelingo', component: 'UserMessage', props: { text, origin, isExpanded: true } }) as const

test('自分の指示の下に訳が出る（どの面でも）', async ($, on) => {
  const { clock } = engine(on)
  await $.prompt.submit({ text: 'ログ見て', wait: false, origin: composer })
  await clock.advance(0)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...row('ログ見て'), surface })
    expect(await ui.find({ type: 'Text', text: '↳ EN: ログ見て' })).toBeDefined()
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

test('オフの設定では訳さない', { options: { enabled: false } }, async ($, on) => {
  const { clock, asked } = engine(on)
  await $.prompt.submit({ text: 'ログ見て', wait: false, origin: composer })
  await clock.advance(0)
  expect(asked).toHaveLength(0)
})

test('/lingo はオン/オフの設定を切り替える', async ($, on) => {
  engine(on)
  const set: unknown[] = []
  on('config.set', (_$, e) => (set.push([e.key, e.value]), { value: e.value }))
  await $.command.run({ command: 'lingo', args: '', origin: composer, presentation: { isFullscreen: false, columns: 80 } })
  expect(set).toEqual([['claudelingo.enabled', false]])
})

test('翻訳モデルを設定で変えられる', { options: { model: 'sonnet' } }, async ($, on) => {
  const { clock, models } = engine(on)
  await $.prompt.submit({ text: 'ログ見て', wait: false, origin: composer })
  await clock.advance(0)
  expect(models).toEqual(['sonnet'])
})
