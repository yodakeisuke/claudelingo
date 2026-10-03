import { describe, it } from 'node:test'
import { RuleTester } from 'oxlint/plugins-dev'
import plugin from './mainstream.js'

RuleTester.describe = describe
RuleTester.it = it
const tester = new RuleTester({ languageOptions: { parserOptions: { lang: 'tsx' } } })
const run = (name, valid, invalid) => tester.run(name, plugin.rules[name], { valid, invalid: invalid.map(code => ({ code, errors: 1 })) })

run('no-context', [
  "on('prompt.submit', ($, e, next) => next(e))",
  "on('ui.render', { component: 'UserMessage' }, async ($, e, next) => { const row = await next(e); return row })",
  "on('ui.render', { component: 'Pane', requestId: 'x' }, async $ => null)",
  "on('command.run', { command: 'lingo' }, async $ => ({}))",
  "$.prompt.fill({ text: 'a' })",
], [
  "on('prompt.context', ($, e, next) => next(e))",
  "on('classic.PreToolUse', () => ({ deny: 'no' }))",
  "on('prompt.submit', ($, e, next) => next({ ...e, text: 'x' }))",
  "on('ui.render', { component: 'AssistantMessage' }, async $ => null)",
  "$.prompt.submit({ text: 'a' })",
  "$.session.append({ text: 'a' })",
])

run('no-delay', [
  "on('prompt.submit', ($, e, next) => { $.clock.after(0, () => void $.model.complete(r)); return next(e) })",
  "on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => { await $.store.get('x'); return next(e) })",
  "on('ui.render', { component: 'UserMessage' }, async ($, e, next) => { const press = async () => await $.model.complete(r); return next(e) })",
  "on('ui.render', { component: 'UserMessage' }, async ($, e, next) => { void $.audio.speak('a'); return next(e) })",
  "on('ui.render', { component: 'Pane', requestId: 'x' }, async ($, e) => { await $.model.complete(r) })",
], [
  "on('prompt.submit', async ($, e, next) => { await $.model.complete(r); return next(e) })",
  "on('ui.render', { component: 'UserMessage' }, async ($, e, next) => { const v = await Completions.of($.model.complete(r)); return next(e) })",
  "const s = async $ => $.mcp.call('a', 'b'); const t = async $ => { await s($) }; on('prompt.edit', async ($, e, next) => { await t($); return next(e) })",
  "on('prompt.submit', async ($, e, next) => { await $.ui.ask('ok?'); return next(e) })",
])
