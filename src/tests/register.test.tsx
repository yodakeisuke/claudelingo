import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { ModelCompleteResult, On, PromptOrigin, RenderSurface } from 'claude-code'

import { REPLY_PANE } from '../hooks/ui/reply-translation/reply-translation'
import { ElementKeys } from '../logic/element-key/element-key'

const composer: PromptOrigin = { kind: 'composer' }
const usage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

// エンジン役：返事は "EN: <入力>"、行はそのまま。fail で失敗の仕方を変える
const engine = (on: On, fail?: 'api-error' | 'reject', surfaces: RenderSurface[] = ['terminal'], saved?: object, isWritable = true) => {
  const clock = mock.clock(on)
  // 絵の返事を待たせる関所。hold で閉じ、返る関数で開ける。テストごとに別
  let gate = Promise.resolve()
  const hold = () => {
    let release = () => {}
    gate = new Promise(resolve => (release = resolve))
    return release
  }
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
    if (prompt.startsWith('{"pressed"') && e.system?.includes('EX: <sentence>')) return { value: { isAnswered: true, text: 'EX: Please carry on.\nTR: どうぞ続けて。', usage } }
    if (prompt.startsWith('{"pressed"')) return gate.then(() => ({ value: card(JSON.parse(prompt).pressed) }))
    if (prompt.startsWith('[1] ')) return { value: { isAnswered: true, text: `INTO: TARGET\n${prompt.replace(/\] /g, '] EN ')}`, usage } }
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
  on('ui.render', { component: 'AssistantMessage' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>{e.props.text}</Text>
  })
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  return { clock, asked, models, store, hold }
}

// 単語の絵の返事：carry と on は carry on、tests は文の別の句（迷子）、ほかはその語
const UNITS: Record<string, string> = { carry: 'carry on', on: 'carry on', tests: 'carry on' }
const card = (pressed: string): ModelCompleteResult => ({ isAnswered: true, text: `UNIT: ${UNITS[pressed] ?? pressed}\nPRON: /x/\nCAPTION: ${pressed} の絵\nSVG:\n<svg viewBox="0 0 480 288" width="480"><rect/></svg>`, usage })

// 指示の行・返事のブロックのボタンの名前
const lineKey = (text: string, key: string) => `${ElementKeys.of('line', text)}-${key}`
const replyKey = (text: string, key: string) => `${ElementKeys.of('reply', text)}-${key}`

const row = (text: string, origin: PromptOrigin = composer) =>
  ({ plugin: 'claudelingo', component: 'UserMessage', props: { text, origin, isExpanded: true } }) as const

const pane = { title: 'claudelingo', isFocused: true, bodyColumns: 80, placement: 'inline', scroll: { offset: 0, bodyRows: 7 }, view: {} } as const
// 返事の訳のパネル
const replyPane = { plugin: 'claudelingo', surface: 'desktop', component: 'Pane', requestId: REPLY_PANE, props: { ...pane, title: '訳' } } as const

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
    expect((await ui.find({ type: 'Text', text: /^tests$/ }))?.props.bold).toBe(true)
    expect(await ui.find({ type: 'Markdown', text: 'each の後は単数' })).toBeDefined()
  })

  test('自分の指示の下に訳が出る（どの面でも）', async ($, on) => {
    const { clock } = engine(on, undefined, undefined, { card: false })
    await $.prompt.submit({ text: 'ログ見て', wait: false, origin: composer })
    await clock.advance(0)
    for (const surface of ['terminal', 'desktop'] as const) {
      const ui = await $.ui.mount({ ...row('ログ見て'), surface })
      expect(await ui.find({ type: 'Text', text: 'EN: ログ見て' })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /^ログ見て$/ })).toBeDefined()
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
    expect(await ui.findAll({ type: 'Text' })).toHaveLength(1)
  })

  for (const fail of ['api-error', 'reject'] as const) {
    test(`訳に失敗（${fail}）したら理由を出し、送信は通る`, async ($, on) => {
      const { clock } = engine(on, fail)
      expect(await $.prompt.submit({ text: 'ログ見て', wait: false, origin: composer })).toEqual({ text: 'ログ見て' })
      await clock.advance(0)
      const ui = await $.ui.mount({ ...row('ログ見て'), surface: 'terminal' })
      expect(await ui.find({ type: 'Text', text: /^訳せませんでした：.+/ })).toBeDefined()
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
    for (const [surface, target, model] of [['terminal', 'Spanish', 'opus'], ['desktop', 'French', 'haiku']] as const) {
      const ui = await $.ui.mount({ plugin: 'claudelingo', surface, component: 'Pane', requestId: 'claudelingo', props: pane })
      await ui.input({ key: 'target', text: target })
      await ui.input({ key: 'level', text: `${target} 初級` })
      await ui.press({ key: `model-${model}` })
      expect(store.get('settings')).toEqual({ enabled: true, native: 'Japanese', target, level: `${target} 初級`, model, afterSend: true, live: true, liveModel: 'sonnet', livePause: '0.5', card: true, cardModel: 'sonnet', voice: 'Samantha' })
      expect((await ui.find({ type: 'Button', key: `model-${model}` }))?.props.variant).toBe('primary')
      for (const enabled of [false, true]) {
        await ui.press({ key: 'enabled' })
        expect(store.get('settings')).toMatchObject({ enabled })
        expect((await ui.find({ type: 'Button', key: 'enabled' }))?.props.label).toBe(enabled ? 'オフにする' : 'オンにする')
      }
    }
  })

  test('反応の速さは -/+ で 0.1 秒ずつ動き、打ち込んだ数（全角も）は 0.1 秒刻みで 0.3〜2 秒に収め、数で始まらなければ変えない', async ($, on) => {
    const { store } = engine(on, undefined, undefined, { livePause: '1.9' })
    const pause = () => (store.get('settings') as { livePause: string }).livePause
    const ui = await $.ui.mount({ plugin: 'claudelingo', surface: 'desktop', component: 'Pane', requestId: 'claudelingo', props: pane })
    for (const [act, now] of [[() => ui.press({ key: 'livePause-+' }), '2'], [() => ui.press({ key: 'livePause-+' }), '2'], [() => ui.input({ key: 'livePause', text: '0.34' }), '0.3'], [() => ui.press({ key: 'livePause--' }), '0.3'], [() => ui.input({ key: 'livePause', text: '速め' }), '0.3'], [() => ui.input({ key: 'livePause', text: '' }), '0.3'], [() => ui.input({ key: 'livePause', text: '０．７秒' }), '0.7'], [() => ui.press({ key: 'livePause-+' }), '0.8']] as const) {
      await act()
      expect(pause()).toBe(now)
    }
  })

  test('オフにしたまとまりは見出しと切り替えだけになり、オンに戻すと下の設定がまた出る。mod ごとオフなら他のまとまりも出ない', async ($, on) => {
    engine(on)
    const ui = await $.ui.mount({ plugin: 'claudelingo', surface: 'desktop', component: 'Pane', requestId: 'claudelingo', props: pane })
    await ui.press({ key: 'live' })
    expect(await ui.find({ type: 'Input', key: 'livePause' })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: '○ オフ' })).toBeDefined()
    await ui.press({ key: 'live' })
    expect(await ui.find({ type: 'Input', key: 'livePause' })).toBeDefined()
    await ui.press({ key: 'enabled' })
    expect(await ui.find({ type: 'Button', key: 'live' })).toBeUndefined()
  })

  test('無効にしても、モデルを変えても、出ている訳は消えない', async ($, on) => {
    const { clock } = engine(on, undefined, undefined, { card: false })
    await $.prompt.submit({ text: 'ログ見て', wait: false, origin: composer })
    await clock.advance(0)
    const ui = await $.ui.mount({ plugin: 'claudelingo', surface: 'desktop', component: 'Pane', requestId: 'claudelingo', props: pane })
    await ui.press({ key: 'model-opus' })
    await ui.press({ key: 'enabled' })
    const message = await $.ui.mount({ ...row('ログ見て'), surface: 'desktop' })
    expect(await message.find({ type: 'Text', text: 'EN: ログ見て' })).toBeDefined()
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
    await ui.press({ key: lineKey('fix the tests and carry on', 'word-5') })
    expect(await ui.find({ type: 'Text', text: /^carry on$/ })).toBeDefined()
    expect((await ui.find({ type: 'Svg' }))?.props.width).toBe(380)
    expect(await ui.find({ type: 'Text', text: 'carry の絵' })).toBeDefined()
    await ui.press({ key: lineKey('fix the tests and carry on', 'word-6') })
    expect(await ui.find({ type: 'Svg' })).toBeUndefined()
    await ui.press({ key: lineKey('fix the tests and carry on', 'word-6') })
    expect(await ui.find({ type: 'Svg' })).toBeDefined()
    expect(asked).toEqual(['fix the tests and carry on', '{"pressed":"carry","sentence":"EN: fix the tests and carry on"}'])
  })

  test('別の語の絵は並んで出て、拡大・縮小はその絵だけ', async ($, on) => {
    const { clock } = engine(on)
    const ui = await sent($, clock)
    await ui.press({ key: lineKey('fix the tests and carry on', 'word-1') })
    await ui.press({ key: lineKey('fix the tests and carry on', 'word-5') })
    expect(await ui.findAll({ type: 'Svg' })).toHaveLength(2)
    await ui.press({ key: lineKey('fix the tests and carry on', 'resize-carry') })
    expect((await ui.findAll({ type: 'Svg' })).map(s => s.props.width)).toEqual([380, 560])
    expect((await ui.find({ type: 'Button', key: lineKey('fix the tests and carry on', 'resize-carry') }))?.props.label).toBe('縮小')
    await ui.press({ key: lineKey('fix the tests and carry on', 'resize-carry') })
    expect((await ui.findAll({ type: 'Svg' })).map(s => s.props.width)).toEqual([380, 380])
  })

  test('押した語と関わらない句が返ったら、描けなかったと出す', async ($, on) => {
    const { clock } = engine(on)
    const ui = await sent($, clock)
    await ui.press({ key: lineKey('fix the tests and carry on', 'word-3') })
    expect(await ui.find({ type: 'Text', text: '描けませんでした：tests' })).toBeDefined()
  })

  test('端末では語の間に空白を挟み、絵の代わりに句と一文を出す', async ($, on) => {
    const { clock } = engine(on)
    const ui = await sent($, clock, 'terminal')
    expect(await ui.findAll({ type: 'Text', text: /^ $/ })).toHaveLength(6)
    await ui.press({ key: lineKey('fix the tests and carry on', 'word-5') })
    expect(await ui.find({ type: 'Text', text: 'carry の絵' })).toBeDefined()
    expect(await ui.find({ type: 'Svg' })).toBeUndefined()
    expect(await ui.find({ type: 'Button', key: lineKey('fix the tests and carry on', 'resize-carry') })).toBeUndefined()
  })

  test('単語の絵を無効にすると、訳の行は今までどおり文で出る', async ($, on) => {
    const { clock } = engine(on, undefined, undefined, { card: false })
    const ui = await sent($, clock)
    expect(await ui.find({ type: 'Text', text: 'EN: fix the tests and carry on' })).toBeDefined()
    expect(await ui.find({ type: 'Button', key: lineKey('fix the tests and carry on', 'word-0') })).toBeUndefined()
  })

  test('絵を描いている間も例文を押せ、開いた欄は絵が届いても残り、押し直すと閉じる', async ($, on) => {
    const { clock, hold } = engine(on)
    const ui = await sent($, clock)
    const release = hold()
    await ui.press({ key: lineKey('fix the tests and carry on', 'word-5') })
    expect((await ui.find({ type: 'Svg' }))?.props.width).toBe(380)
    await ui.press({ key: lineKey('fix the tests and carry on', 'aspect-carry-examples') })
    expect(await ui.find({ type: 'Text', text: 'どうぞ続けて。' })).toBeDefined()
    expect((await ui.find({ type: 'Button', key: lineKey('fix the tests and carry on', 'aspect-carry-examples') }))?.props.dimColor).toBe(false)
    release()
    await clock.advance(0)
    expect(await ui.find({ type: 'Text', text: 'carry の絵' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'Please carry on.' })).toBeDefined()
    await ui.press({ key: lineKey('fix the tests and carry on', 'aspect-carry-examples') })
    expect(await ui.find({ type: 'Text', text: 'Please carry on.' })).toBeUndefined()
  })

  test('端末でも例文などのボタンが出て、欄は文字で開く', async ($, on) => {
    const { clock } = engine(on)
    const ui = await sent($, clock, 'terminal')
    await ui.press({ key: lineKey('fix the tests and carry on', 'word-5') })
    await ui.press({ key: lineKey('fix the tests and carry on', 'aspect-carry-examples') })
    expect(await ui.find({ type: 'Text', text: 'どうぞ続けて。' })).toBeDefined()
    expect(await ui.find({ type: 'Button', key: lineKey('fix the tests and carry on', 'aspect-carry-origin') })).toBeDefined()
  })

  test('返事の 🌐 を押すと横のパネルに段落ごとの訳が出て（コードは訳さない）、訳の語から絵が出る。返事はそのまま', async ($, on) => {
    const { asked } = engine(on)
    on('ui.open', () => ({ value: { isPlaced: true } }))
    const text = '原因はここ。\n\n```ts\nconst a = 1\n\nconst b = 2\n```\n\ncarry on して'
    const ui = await $.ui.mount({ plugin: 'claudelingo', surface: 'desktop', component: 'AssistantMessage', props: { text, isFirstOfReply: true } })
    await ui.press({ key: replyKey(text, 'translate') })
    expect(asked).toEqual(['[1] 原因はここ。\n\n[2] carry on して'])
    expect(await ui.find({ type: 'Text', text })).toBeDefined()
    const side = await $.ui.mount(replyPane)
    expect(await side.find({ type: 'Text', text: '原因はここ。' })).toBeDefined()
    expect(await side.find({ type: 'Button', key: replyKey(text, 'word-0-0-1') })).toBeDefined()
    expect(await side.find({ type: 'Button', key: replyKey(text, 'word-1-0-0') })).toBeUndefined()
    await side.press({ key: replyKey(text, 'word-2-0-1') })
    expect(await side.find({ type: 'Text', text: /^carry on$/ })).toBeDefined()
    expect(asked.at(-1)).toBe('{"pressed":"carry","sentence":"EN carry on して"}')
    expect(await side.find({ type: 'Button', key: replyKey(text, 'word-2-resize-carry') })).toBeDefined()
  })

  test('🔊 を押すと設定の声で読み、文はその下に発音記号が出る。返事は学ぶ言語の段落を順に読む', async ($, on) => {
    const { clock } = engine(on, undefined, undefined, { card: false })
    on('ui.open', () => ({ value: { isPlaced: true } }))
    const spoken: string[] = []
    on('audio.speak', (_$, e) => (spoken.push(`${e.voice}: ${e.text}`), { value: { via: 'system' } }))
    await $.prompt.submit({ text: 'fix **tests**', wait: false, origin: composer })
    await clock.advance(0)
    const ui = await $.ui.mount({ ...row('fix **tests**'), surface: 'desktop' })
    await ui.press({ key: lineKey('fix **tests**', 'speak') })
    expect(spoken).toEqual(['Samantha: EN: fix tests'])
    expect(await ui.find({ type: 'Text', text: 'EN EN: fix tests' })).toBeDefined()
    const reply = await $.ui.mount({ plugin: 'claudelingo', surface: 'desktop', component: 'AssistantMessage', props: { text: '原因はここ。\n\n直した', isFirstOfReply: true } })
    await reply.press({ key: replyKey('原因はここ。\n\n直した', 'translate') })
    const side = await $.ui.mount(replyPane)
    await side.press({ key: replyKey('原因はここ。\n\n直した', 'speak') })
    expect(spoken.slice(1)).toEqual(['Samantha: EN 原因はここ。', 'Samantha: EN 直した'])
    expect(await side.find({ type: 'Text', text: 'EN EN 直した' })).toBeDefined()
  })

  test('🎤 を押すと入力欄の上に練習が開き、声で入れた文をお手本と比べてコーチする。もう一度で入れ直し、押し直すと閉じる', async ($, on) => {
    const { clock, asked } = engine(on, undefined, undefined, { card: false })
    await $.prompt.submit({ text: 'fix **tests**', wait: false, origin: composer })
    await clock.advance(0)
    const ui = await $.ui.mount({ ...row('fix **tests**'), surface: 'desktop' })
    await ui.press({ key: lineKey('fix **tests**', 'practise') })
    const band = await $.ui.mount({ plugin: 'claudelingo', surface: 'desktop', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 80, scroll: { offset: 0, bodyRows: 20 }, view: {} } })
    expect(await band.find({ type: 'Text', text: 'EN: fix tests' })).toBeDefined()
    await band.input({ key: 'practice', text: 'fix tess' })
    expect(asked.at(-1)).toBe('<sample>EN: fix tests</sample>\n<heard>fix tess</heard>')
    expect(await band.find({ type: 'Text', text: '聞き取り' })).toBeDefined()
    await band.press({ key: 'practice-again' })
    expect(await band.find({ type: 'Text', text: '聞き取り' })).toBeUndefined()
    await ui.press({ key: lineKey('fix **tests**', 'practise') })
    expect(await band.find({ type: 'Text', text: 'お手本' })).toBeUndefined()
  })
})
