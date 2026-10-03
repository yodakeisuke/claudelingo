import { describe, expect, test } from 'claude-code/testing'

import { Grass } from '../../logic/grass/grass'

describe('grass', () => {
  test('数えるのはラテン文字の語（don\'t は 1 語）で、貼り付けとコードは数えず、その日の分に足す', () => {
    const text = 'これ fix して。don\'t 壊さないで `npm test`\n```\nconst a = 1\n```\n<pasted_content id="1">\nError: boom\n</pasted_content id="1">'
    expect(Grass.added(undefined, '2026-10-03', text)).toEqual({ '2026-10-03': 2 })
    expect(Grass.added({ '2026-10-02': 5, '2026-10-03': 2 }, '2026-10-03', 'Café ok')).toEqual({ '2026-10-02': 5, '2026-10-03': 4 })
  })

  test('日はその土地の暦の日', () => {
    // UTC の正午なら、どの時差でも同じ日
    expect(Grass.day(Date.UTC(2026, 9, 3, 12))).toBe('2026-10-03')
  })

  test('草は今日の週で終わる 53 週（日曜はじまり）。月の名は日曜が 1〜7 日の週に出し、濃さは語数で 4 段、合計はこれまでの全部', () => {
    const saved = { '2026-09-28': 99, '2026-09-29': 100, '2026-09-30': 249, '2026-10-01': 250, '2026-10-02': 1000, '2025-01-01': 7 }
    const { weeks, total } = Grass.of(saved, '2026-10-02')
    expect(weeks).toHaveLength(53)
    expect(weeks[0]).toEqual({ month: undefined, levels: [0, 0, 0, 0, 0, 0, 0] })
    expect(weeks.at(-1)).toEqual({ month: undefined, levels: [0, 1, 2, 2, 3, 3] })
    expect(weeks.flatMap(w => w.month ?? [])).toEqual([10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(total).toBe(1705)
  })
})
