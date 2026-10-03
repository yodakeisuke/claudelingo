import { describe, it } from 'node:test'
import { RuleTester } from 'oxlint/plugins-dev'
import plugin from './ui-layout.js'

RuleTester.describe = describe
RuleTester.it = it
const tester = new RuleTester({ languageOptions: { parserOptions: { lang: 'tsx' } } })
const valid = [
  "import type { Elements } from 'claude-code'\nexport const f = (t: Elements['terminal'], press: () => void) => <t.Button key=\"go\" label=\"go\" onPress={press} />",
  'const f = () => <Text color="error">x</Text>',
  'const f = () => <Button key="go" label="go" />',
]

// 独立入力: 規則ごとの落ちる例 / 出力: 違反 1 つ
const cases = {
  'ui-pure': ["import { read } from 'claude-code'", "import { type Elements, atom } from 'claude-code'", "import type { EngineInterface as E } from 'claude-code'\nconst f = ($: E) => 1", "import type * as C from 'claude-code'\nconst f = ($: C.EngineInterface) => 1",
    'const f = async () => 1', 'const f = async function () { return 1 }'],
  'theme-color': ['const f = () => <Text color="red">x</Text>', "const f = () => <Text color={'#ff0000'}>x</Text>", 'const f = () => <Box borderColor="rgb(1,2,3)" />', 'const f = () => <Text backgroundColor="blueBright" />'],
  'button-key': ['const f = () => <Button label="go" />', 'const f = () => <t.Button label="go" />'],
}
for (const [name, invalid] of Object.entries(cases)) {
  tester.run(name, plugin.rules[name], { valid, invalid: invalid.map(code => ({ code, errors: 1 })) })
}
