import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { RuleTester } from 'oxlint/plugins-dev'
import plugin from './logic-layout.js'

RuleTester.describe = describe
RuleTester.it = it
const tester = new RuleTester({ languageOptions: { parserOptions: { lang: 'ts' } } })
const file = (...sections) => sections.join('\n')
const api = '// --- public interface\nexport const A = { f: (x: T) => f(x), g: (x: T) => b(x) }'
const io = '// --- I/O\ntype T = number'
const ops = '// --- operations\nconst f = (x: number) => b(x) + 1'
const rules = '// --- business rules\n// b は 1\nconst b = (x: number) => x > 0 ? 1 : 0'
const valid = file(api, io, ops, rules)

// 独立入力: 規則ごとの落ちる例 / 出力: 違反 1 つ。通る例はどれも valid
const cases = {
  exports: ['export function f() { return 1 }', 'export type T = number', 'export const x = 1', 'export const A = { v: 1 }',
    'export default {}', "export * from './x'", 'export const A = { f: () => 1 }\nexport const B = { g: () => 1 }'],
  sections: [file(api, ops, io, rules), file(api, io, ops), file(io, api, rules), file(api, io, ops, rules, '// --- business rules')],
  placement: [file(api, io, ops, '// --- business rules\ntype U = number'), file(api, '// --- I/O\nconst x = 1', rules),
    file(api, io, '// --- operations\nconst x = 1', rules)],
  'interface-forward': ['export const A = { f: (x: number) => x + 1 }', 'export const A = { f: (x: number) => f(x + 1) }', 'export const A = { f: (x: number) => B.f(x) }'],
  'io-only': [file(api, io, '// --- I/O\ntype U = number', ops, rules)],
  'one-expression': [file(api, io, '// --- operations\nconst f = (x: number) => x > 0 ? b(x) : 0', rules),
    file(api, io, '// --- operations\nconst f = (x: number) => { return b(x) }', rules), file(api, io, '// --- operations\nconst f = (x: number) => b(x) || 0', rules)],
  'rule-comment': [file(api, io, ops, '// --- business rules\nconst b = () => 1')],
  'comment-run': ['// a\n// b\n// c\nconst x = 1'],
  'result-only': ["throw new Error('x')", 'try { f() } catch { g() }', 'p.catch(() => 1)', "Promise.reject('x')", 'p.then(f, g)', 'r.ok ? 1 : 2'],
}
for (const [name, invalid] of Object.entries(cases)) {
  tester.run(name, plugin.rules[name], { valid: [valid], invalid: invalid.map(code => ({ code, errors: 1 })) })
}
// 組み込みルールと無効化コメントの禁止: logic/ の下に置いたファイルへ、この設定のまま掛ける
describe('組み込みルール', () => {
  const root = fileURLToPath(new URL('..', import.meta.url))
  const inLogic = (source, check) => {
    const directory = mkdtempSync(join(root, 'lint', '.fixture-'))
    try {
      mkdirSync(join(directory, 'logic'), { recursive: true })
      writeFileSync(join(directory, 'logic', 'x.ts'), source)
      return check(join(directory, 'logic'))
    } finally { rmSync(directory, { recursive: true }) }
  }
  const lint = source => inLogic(source, directory => {
    try { execFileSync('npx', ['oxlint', '--format', 'json', directory], { cwd: root, encoding: 'utf8' }); return [] }
    catch (error) { return JSON.parse(error.stdout).diagnostics.map(d => d.code) }
  })
  const disables = source => inLogic(source, directory => {
    try { execFileSync('npm', ['run', '--silent', 'lint:disable', '--', directory], { cwd: root, stdio: 'ignore' }); return [] }
    catch { return ['lint:disable'] }
  })
  const withRule = body => file(api, io, '// --- operations\nconst f = (x: number) => c(x)', rules, `// c\n${body}`)
  const branches = n => `const c = (x: number) => ${Array.from({ length: n }, (_, i) => `x === ${i}`).join(' || ')} ? 2 : 2`
  const lines = n => `const c = () => [\n${Array.from({ length: n }, (_, i) => `  ${i},`).join('\n')}\n]`
  const depth = n => `const c = (x: number) => {\n${'  if (x) {\n'.repeat(n)}  return 2\n${'  }\n'.repeat(n)}  return 2\n}`
  const params = n => {
    const names = Array.from({ length: n }, (_, i) => `p${i}`)
    return `const c = (${names.map(name => `${name}?: number`).join(', ')}) => [${names.join(', ')}].length`
  }
  // 行を足して長さを作る。コメントは 2 行続けたら 1 行空ける（comment-run に掛からないように）
  const padded = n => [valid, ...Array.from({ length: n - valid.split('\n').length }, (_, i) => ((n - i) % 3 === 2 ? '' : '//'))].join('\n')
  const examples = [
    ['max-lines は 1 ファイル 70 行まで', lint, padded(70), padded(71), 'eslint(max-lines)'],
    ['complexity は 5 まで', lint, withRule(branches(4)), withRule(branches(5)), 'eslint(complexity)'],
    ['max-lines-per-function は 15 行まで', lint, withRule(lines(13)), withRule(lines(14)), 'eslint(max-lines-per-function)'],
    ['max-depth は 2 まで', lint, withRule(depth(2)), withRule(depth(3)), 'eslint(max-depth)'],
    ['max-params は 3 まで', lint, withRule(params(3)), withRule(params(4)), 'eslint(max-params)'],
    ['logic から hooks を読まない', lint, valid, "import { x } from '../hooks/register'\n" + valid, 'eslint(no-restricted-imports)'],
    ['logic から engine（claude-code）を読まない', lint, valid, "import type { On } from 'claude-code'\n" + valid, 'eslint(no-restricted-imports)'],
    ['logic から node: を読まない', lint, valid, "import { readFileSync } from 'node:fs'\n" + valid, 'eslint(no-restricted-imports)'],
    ['logic に無効化コメントを書かない', disables, valid, '// oxlint-disable\n' + valid, 'lint:disable'],
  ]
  for (const [name, check, passing, failing, code] of examples) it(name, () => {
    assert.deepEqual(check(passing), [])
    assert.ok(check(failing).includes(code))
  })
})
