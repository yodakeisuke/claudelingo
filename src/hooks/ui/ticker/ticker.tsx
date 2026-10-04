import type { Elements } from 'claude-code'

// 待っている間・読み上げている間だけ動く一言。動きは小さな枠（Client）の中だけで回し、ほかの描画を巻き込まない。Client の無い面は止まった文字
// sound は音の棒と、後ろに text（重なった数など）。elapsed があれば経過秒も（from は描き始めるまでに経った秒、unit は「秒」などの単位）
export const ticker = (t: Elements[keyof Elements], key: string, kind: 'wait' | 'sound', text: string, elapsed?: { from: number; unit: string }) => {
  const { Text } = t
  return 'Client' in t ? <t.Client key={key} module="./ticker-client.tsx" props={elapsed ? { kind, text, ...elapsed } : { kind, text }} /> : <Text dimColor>{text}</Text>
}
