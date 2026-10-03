// 永続化のルール。ユーザーのディスクに残してよいのは設定と、草の日ごとの語数だけ。
const MESSAGE = 'ディスクに残してよいのは設定（$.store の settings）と草の日ごとの語数（words）だけ。それ以外はセッションの間だけ atom に持つ'
// $.store の settings と words の set・delete だけ通す。$.fs.write・$.config.set・$.process は書き込みの抜け道
const isAllowed = (area, action, key) => area !== 'store' || !['set', 'delete'].includes(action) || ['settings', 'words'].includes(key?.value)
const isWrite = (area, action) => (area === 'fs' && action === 'write') || (area === 'config' && action === 'set') || area === 'process'
const nameOf = node => (node?.type === 'MemberExpression' && !node.computed ? node.property.name : undefined)

export default {
  meta: { name: 'persistence' },
  rules: {
    'settings-only': {
      meta: { type: 'problem', docs: { description: '設定と草の語数のほかは永続化しない' } },
      create: context => ({
        CallExpression: node => {
          const [area, action] = [nameOf(node.callee.object), nameOf(node.callee)]
          if (isWrite(area, action) || !isAllowed(area, action, node.arguments[0])) context.report({ node, message: MESSAGE })
        },
      }),
    },
  },
}
