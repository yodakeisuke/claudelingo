// --- public interface
export const ElementKeys = {
  of: (scope: string, text: string) => of(scope, text),
}

// --- business rules
// メッセージごとのボタンの名前の頭。デスクトップは会話を一つの画面に並べ、同じ名前が並ぶと最後のメッセージにしか描かない
const of = (scope: string, text: string) => `${scope}-${[...text].reduce((h, c) => Math.imul(h ^ c.codePointAt(0)!, 16777619) >>> 0, 2166136261).toString(36)}`
