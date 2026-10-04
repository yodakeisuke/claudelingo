// --- public interface
export const Grass = {
  day: (ms: number) => day(ms),
  added: (saved: unknown, day: string, text: string) => added(saved, day, text),
  of: (saved: unknown, today: string) => of(saved, today),
}

// --- operations
// 草：今日の週で終わる 1 年分の週と、これまでの語数の合計
const of = (saved: unknown, today: string) => ({ weeks: year(today).map(week => shown(week, days(saved), today)), total: Object.values(days(saved)).reduce((sum, n) => sum + n, 0) })

// --- business rules
// 日は、その土地の暦の日（YYYY-MM-DD）
const day = (ms: number) => new Date(ms - new Date(ms).getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
// 保存してある日ごとの語数（まだ無ければ空）
const days = (saved: unknown) => (saved ?? {}) as Record<string, number>
// 送った指示の語数を、その日の分に足す
const added = (saved: unknown, day: string, text: string) => ({ ...days(saved), [day]: (days(saved)[day] ?? 0) + words(text) })
// 数えるのは、ラテン文字の語（' でつながる語は 1 語）。貼り付けとコード（``` と `）は数えない
const words = (text: string) => text.replace(/<pasted_content[^>]*>[\s\S]*?<\/pasted_content[^>]*>|```[\s\S]*?```|`[^`\n]*`/g, ' ').match(/\p{Script=Latin}+(?:['’]\p{Script=Latin}+)*/gu)?.length ?? 0
// 1 年分は GitHub の草と同じ 53 週（日曜はじまり）。最後の週は今日を含む週
const year = (today: string) => {
  const sunday = Date.parse(today) - new Date(today).getUTCDay() * 86_400_000
  return Array.from({ length: 53 }, (_, w) => Array.from({ length: 7 }, (_, d) => new Date(sunday + ((w - 52) * 7 + d) * 86_400_000).toISOString().slice(0, 10)))
}
// 週ごとに、日曜が 1〜7 日ならその月（月の名を出す週）と、今日までの日の濃さ
const shown = ([sunday = '', ...rest]: string[], counts: Record<string, number>, today: string) =>
  ({ month: Number(sunday.slice(8)) <= 7 ? Number(sunday.slice(5, 7)) : undefined, levels: [sunday, ...rest].filter(d => d <= today).map(d => level(counts[d] ?? 0)) })
// 濃さは 4 段。0 語、100 語未満、250 語未満、それ以上
const level = (n: number) => [1, 100, 250].filter(least => n >= least).length
