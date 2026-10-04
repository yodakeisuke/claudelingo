import type { ClientModule } from 'claude-code'

type Props = { kind: 'wait' | 'sound'; text: string; from?: number; unit?: string }

// 待ちは点字の回る印、読み上げは音の棒。どちらも 1 コマ 0.1 秒
const FRAMES = { wait: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'], sound: ['▁▃▅', '▃▅▇', '▅▇▅', '▃▅▃'] }

// 枠ごとにコマを数える。時計は最初の 1 回だけ掛け、経過秒の起点（from）もそのときの値で持つ（描き直しで枠が作り直されても、押してからの秒で続く）
const Ticker: ClientModule<Props, { n: number; from: number }> = ({ kind, text, from = 0, unit }, surface) => {
  if (surface.state === undefined) {
    let n = 0
    surface.every(100, () => surface.setState({ n: ++n, from }))
    surface.setState({ n, from })
  }
  const { n, from: start } = surface.state ?? { n: 0, from }
  const { Text } = surface.elements
  return <Text dimColor>{[FRAMES[kind][n % FRAMES[kind].length], text, unit && `${start + Math.floor(n / 10)}${unit}`].filter(Boolean).join(' ')}</Text>
}

export default Ticker
