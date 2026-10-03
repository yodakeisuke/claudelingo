// --- public interface
export const ElementKeys = {
  of: (scope: string, id: string) => of(scope, id),
}

// --- business rules
// メッセージ（その id）ごとのボタンの名前の頭。デスクトップは会話を一つの画面に並べ、同じ名前が並ぶと最後のメッセージにしか描かない（同じ文のメッセージも別の名前に）
const of = (scope: string, id: string) => `${scope}-${[...id].reduce((h, c) => Math.imul(h ^ c.codePointAt(0)!, 16777619) >>> 0, 2166136261).toString(36)}`
