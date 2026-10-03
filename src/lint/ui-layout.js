// hooks/ui の描き方のルール。.oxlintrc.json で hooks/ui/ の下だけに掛ける。
const rule = (description, create) => ({ meta: { type: 'problem', docs: { description } }, create })
const attribute = (node, name) => node.attributes.find(a => a.type === 'JSXAttribute' && a.name.name === name)
// <Button> も <t.Button> も同じ要素
const elementName = name => (name.type === 'JSXMemberExpression' ? name.property.name : name.name)
const literal = value => (value?.type === 'JSXExpressionContainer' ? value.expression : value)
// テーマの鍵でない、生の色（#hex・rgb()・hsl()・ansi・ANSI の色名）
const isRaw = color => /^(#|rgb|hsl|ansi)/i.test(color) || /^(black|red|green|yellow|blue|magenta|cyan|white|gr[ae]y)(bright)?$/i.test(color)

export default {
  meta: { name: 'ui-layout' },
  rules: {
    'ui-pure': rule('ui は受け取った値から木を返すだけ', context => {
      const report = node => context.report({ node, message: 'ui は描くだけ。状態（atom / read / update）・$・async は register.tsx（ui.render フック）で扱い、値と関数を渡す' })
      const isAsync = node => node.async && report(node)
      return {
        ImportDeclaration: node => /^claude-code(\/|$)/.test(node.source.value) && node.specifiers.some(s => (node.importKind !== 'type' && s.importKind !== 'type') || s.imported?.name === 'EngineInterface') && report(node),
        TSQualifiedName: node => node.right.name === 'EngineInterface' && report(node),
        ArrowFunctionExpression: isAsync, FunctionExpression: isAsync, FunctionDeclaration: isAsync,
      }
    }),
    'theme-color': rule('色はテーマの鍵で指定する', context => ({
      JSXAttribute: node => {
        const value = literal(node.value)
        if (/^(color|backgroundColor|borderColor)$/.test(node.name.name) && typeof value?.value === 'string' && isRaw(value.value)) {
          context.report({ node, message: `生の色 "${value.value}" でなく、テーマの鍵（error など）で指定する。ライト・ダークに追従する` })
        }
      },
    })),
    'button-key': rule('Button には key を付ける', context => ({
      JSXOpeningElement: node => elementName(node.name) === 'Button' && !attribute(node, 'key') && context.report({ node, message: 'Button には key を付ける。key は ui.press で押されたボタンを見分ける名前で、省くとラベルになり、同じラベルのボタンを見分けられない' }),
    })),
  },
}
