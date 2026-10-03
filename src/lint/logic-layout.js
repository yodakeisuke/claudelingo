// logic の構成ルール。.oxlintrc.json で logic/ の下だけに掛ける。
const SECTIONS = ['public interface', 'I/O', 'operations', 'business rules']
const [INTERFACE, IO, OPERATIONS, RULES] = SECTIONS.keys()

const unwrap = node => ['TSAsExpression', 'TSSatisfiesExpression', 'ParenthesizedExpression'].includes(node?.type) ? unwrap(node.expression) : node
const isFunction = node => ['ArrowFunctionExpression', 'FunctionExpression'].includes(unwrap(node)?.type)
// public interface: `export const X = { … }` で、中身は関数式か関数を指す名前だけ。
const operationsOf = statement => {
  const declarators = statement.type === 'ExportNamedDeclaration' && statement.declaration?.type === 'VariableDeclaration'
    ? statement.declaration.declarations : []
  const object = declarators.length === 1 ? unwrap(declarators[0].init) : undefined
  return object?.type === 'ObjectExpression' && object.properties.every(p => p.type === 'Property' && (isFunction(p.value) || p.value.type === 'Identifier'))
    ? object.properties : undefined
}
const isFunctionStatement = s => s.type === 'FunctionDeclaration' || (s.type === 'VariableDeclaration' && s.declarations.every(d => isFunction(d.init)))
const isType = s => ['TSTypeAliasDeclaration', 'TSInterfaceDeclaration'].includes(s.type)
const belongs = [s => !!operationsOf(s), isType, isFunctionStatement, isFunctionStatement]

const sectionOf = comment => comment.type === 'Line' ? SECTIONS.indexOf(/^ --- (.+)$/.exec(comment.value)?.[1]) : -1
const sectionComments = context => context.sourceCode.getAllComments().filter(c => sectionOf(c) >= 0)
// 一番外側の文は、その前にある最後のセクションコメントの節に属する。
const placed = (context, program) => {
  const headers = sectionComments(context)
  return program.body.filter(s => s.type !== 'ImportDeclaration').map(statement =>
    ({ statement, section: headers.filter(c => c.range[1] <= statement.range[0]).map(sectionOf).at(-1) ?? -1 }))
}
const within = (node, statements) => statements.some(s => s.range[0] <= node.range[0] && node.range[1] <= s.range[1])
const inSection = (context, program, section) => placed(context, program).filter(p => p.section === section).map(p => p.statement)
const rule = (description, check) => ({ meta: { type: 'problem', docs: { description } }, create: context => ({ Program: program => check(context, program) }) })

// 失敗を投げる・受け止める書き方と、Result を素手で扱う書き方（2 引数の then、.ok での分岐）。Result で返し、Result.given で受ける
const isMethod = (node, name) => node.type === 'CallExpression' && node.callee.type === 'MemberExpression' && node.callee.property.name === name
const isThrowing = node => node.type === 'ThrowStatement' || node.type === 'TryStatement' || isMethod(node, 'catch') ||
  (isMethod(node, 'reject') && node.callee.object.name === 'Promise') || (isMethod(node, 'then') && node.arguments.length > 1) ||
  (node.type === 'MemberExpression' && !node.computed && node.property.name === 'ok')

export default {
  meta: { name: 'logic-layout' },
  rules: {
    'result-only': {
      meta: { type: 'problem', docs: { description: '失敗は投げずに Result で返し、Result.given で受ける' } },
      create: context => {
        const report = node => isThrowing(node) && context.report({ node, message: '失敗は throw / try / catch / Promise.reject でなく Result で返す。engine の Promise は Result.given で受け、.ok で分けずに and / either / data を使う' })
        return { ThrowStatement: report, TryStatement: report, CallExpression: report, MemberExpression: report }
      },
    },
    exports: rule('export は、操作をまとめたオブジェクト 1 つだけ', (context, program) => {
      const exports = program.body.filter(s => s.type.startsWith('Export'))
      for (const s of exports) if (!operationsOf(s)) context.report({ node: s, message: 'export は `export const X = { 操作: 関数 }` だけ。関数でない値・型・export function・default・再 export は出さない' })
      if (exports.length !== 1) context.report({ node: program, message: `export はモジュールに 1 つ（今は ${exports.length} つ）` })
    }),
    sections: rule('セクションコメントが決まった順に 1 回ずつある', (context, program) => {
      const order = sectionComments(context).map(sectionOf)
      if (order[0] !== INTERFACE || order.at(-1) !== RULES || order.some((s, i) => i > 0 && s <= order[i - 1])) {
        context.report({ node: program, message: 'セクションコメントは // --- public interface →（// --- I/O →）（// --- operations →）// --- business rules の順に 1 回ずつ' })
      }
    }),
    'interface-forward': rule('public interface の操作は、関数を 1 つ呼ぶだけ', (context, program) => {
      for (const p of program.body.flatMap(s => operationsOf(s) ?? [])) {
        const body = unwrap(p.value.body)
        const forwards = p.value.type === 'Identifier' || (body?.type === 'CallExpression' && body.callee.type === 'Identifier' && body.arguments.every(a => a.type === 'Identifier'))
        if (!forwards) context.report({ node: p, message: 'public interface は引数をそのまま operations か business rules の関数 1 つに渡すだけ。中身はそちらに書く' })
      }
    }),
    'io-only': {
      meta: { type: 'problem', docs: { description: 'I/O の型は public interface で使う' } },
      create: context => {
        let types = []
        let users = []
        const used = new Set()
        return {
          Program: program => {
            types = inSection(context, program, IO).filter(isType)
            users = [...inSection(context, program, INTERFACE), ...types]
          },
          TSTypeReference: node => node.typeName.type === 'Identifier' && within(node, users) && used.add(node.typeName.name),
          'Program:exit': () => {
            for (const statement of types) {
              if (!used.has(statement.id.name)) context.report({ node: statement, message: `${statement.id.name} は public interface の引数にも戻りにも出ない。内部の型は作らず、推論に任せる` })
            }
          },
        }
      },
    },
    'one-expression': {
      meta: { type: 'problem', docs: { description: 'operations は分岐も宣言もない 1 つの式' } },
      create: context => {
        let operations = []
        const report = node => within(node, operations) && context.report({ node, message: 'operations は business rules を合成した 1 つの式。ブロック・if・? :・&&・||・?? は書かず、分岐は business rules に置く' })
        return { Program: program => { operations = inSection(context, program, OPERATIONS) }, BlockStatement: report, ConditionalExpression: report, LogicalExpression: report }
      },
    },
    placement: rule('一番外側の文が正しいセクションにある', (context, program) => {
      for (const { statement, section } of placed(context, program)) {
        if (!belongs[section]?.(statement)) {
          context.report({ node: statement, message: 'public interface には操作のオブジェクト、I/O には型、operations と business rules には export しない関数だけを置く' })
        }
      }
    }),
    'rule-comment': rule('ビジネスルールの直前の行にルールを言うコメントがある', (context, program) => {
      const comments = context.sourceCode.getAllComments()
      for (const { statement } of placed(context, program).filter(({ section }) => section === RULES)) {
        const above = comments.find(c => c.loc.end.line === statement.loc.start.line - 1)
        if (above?.type !== 'Line' || !above.value.trim() || sectionOf(above) >= 0) {
          context.report({ node: statement, message: 'ビジネスルールの直前の行に、ルールを言う 1 行コメントを書く' })
        }
      }
    }),
    'comment-run': rule('連続するコメントは 2 行まで', (context) => {
      const lines = context.sourceCode.getAllComments().map(c => c.loc.start.line)
      for (const [i, line] of lines.entries()) {
        if (lines[i - 1] === line - 1 && lines[i - 2] === line - 2) context.report({ loc: { line, column: 0 }, message: '連続するコメントは 2 行まで。要点だけを書く' })
      }
    }),
  },
}
