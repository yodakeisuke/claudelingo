import type { Elements } from 'claude-code'

import type { Grass } from '../../../logic/grass/grass'

type Year = ReturnType<typeof Grass.of>

// 書いた語の草：GitHub の草と同じく 1 日 1 マスで、多く書いた日ほど濃い緑。下に合計を小さく
// Desktop は 1 年分を 1 枚の絵で、端末は入るだけの週（1 週 2 マス）を ■ で
export const grassGraph = (t: Elements[Exclude<keyof Elements, 'mobile'>], isTerminal: boolean, { weeks, total }: Year, columns: number) => {
  const { Box, Text } = t
  const sum = <Text dimColor>{`自分で書いた外国語 ${total.toLocaleString('en-US')} 語`}</Text>
  if (!isTerminal && 'Svg' in t) return <Box flexDirection="column" gap={1}><t.Svg source={picture(weeks)} alt="書いた外国語の草（1 日 1 マス、多く書いた日ほど濃い）" />{sum}</Box>
  const shown = weeks.slice(-Math.floor(columns / 2))
  // 色はテーマの鍵。灰と、ライトでもダークでも多いほど目立つ 3 つの緑（diff の緑と success）
  const square = (level?: number) => level !== undefined && <Text color={['subtle', 'diffAdded', 'diffAddedWord', 'success'][level]}>■ </Text>
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text dimColor>{months(shown)}</Text>
      {[0, 1, 2, 3, 4, 5, 6].map(d => <Text>{shown.map(({ levels }) => square(levels[d]))}</Text>)}
      <Box marginTop={1}>{sum}</Box>
    </Box>
  )
}

// 月の名の行：その週の列から書く（「月」は 1 字で 2 マス）
const months = (weeks: Year['weeks']) => weeks.reduce((row, { month }, w) => (month ? `${row.padEnd(w * 2 - (row.match(/月/g)?.length ?? 0))}${month}月` : row), '')

// Desktop の絵：緑の濃さは不透明度で出す（地がライトでもダークでも読める）。月の名は上に
const picture = (weeks: Year['weeks']) => {
  const cells = weeks.flatMap(({ levels }, w) => levels.map((level, d) => `<rect x="${w * 10}" y="${16 + d * 10}" width="8" height="8" rx="1.5" fill="${level ? '#2da44e' : '#8c959f'}" fill-opacity="${[0.2, 0.4, 0.7, 1][level]}"/>`))
  const labels = weeks.flatMap(({ month }, w) => (month ? [`<text x="${w * 10}" y="10" font-size="12" fill="#8c959f">${month}月</text>`] : []))
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="61" viewBox="0 0 548 84" font-family="-apple-system, 'Hiragino Sans', sans-serif">${labels.join('')}${cells.join('')}</svg>`
}
