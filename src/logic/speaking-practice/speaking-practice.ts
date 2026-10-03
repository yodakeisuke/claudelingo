import type { Answer, Practice } from '../../engine-protocol'
import { Restatements } from '../restatement/restatement'
import { Result } from '../result/result'
import { CoachRequest } from './coach-request'

// --- public interface
export const SpeakingPractice = {
  pressed: (now: Practice | null, text: string, pron?: string) => pressed(now, text, pron),
  kept: (now: Practice | null, heard: string) => kept(now, heard),
  asking: (now: Practice | null, heard: string) => asking(now, heard),
  request: (settings: Settings, asked: Asked) => request(settings, asked),
  coached: (now: Practice | null, asked: Asked, coach: Answer) => coached(now, asked, coach),
  again: (now: Practice | null) => again(now),
  shown: (coach?: Answer | null): Coached | undefined => shown(coach),
}

// --- I/O
type Settings = Parameters<typeof CoachRequest.of>[0]
// コーチを頼んだときの練習：お手本と、声で入れた文
type Asked = { sample: string; heard: string }
// コーチの返事：書き起こし（違う語は ** で囲む）とアドバイス、頼んでいる間の一言、失敗の理由
type Coached = ReturnType<typeof Restatements.of> | string

// --- operations
// 声で入れた文を、お手本と比べるようコーチに頼む
const request = (settings: Settings, asked: Asked) => CoachRequest.of(settings, asked)

// --- business rules
// 押した文の練習を開く（お手本は ** を外した文）。同じ文の練習が開いていれば閉じる
const pressed = (now: Practice | null, text: string, pron?: string) => {
  const sample = Restatements.plain(text)
  return now?.sample === sample ? null : { sample, pron }
}
// 欄の文は打つたびに残す（描き直しで消えないように）
const kept = (now: Practice | null, heard: string) => now && { ...now, heard }
// 声で入れた文があれば、それを聞いている間にする。練習が開いていないか、文が空なら聞かない
const asking = (now: Practice | null, heard: string) => (now && heard.trim() ? { ...now, heard, coach: null } : undefined)
// コーチの返事は、練習が頼んだときのまま（同じお手本と同じ文）のときだけ入れる
const coached = (now: Practice | null, asked: Asked, coach: Answer) => (now?.sample === asked.sample && now.heard === asked.heard ? { ...now, coach } : now)
// もう一度は、お手本はそのまま、欄とコーチを空に
const again = (now: Practice | null) => now && { sample: now.sample, pron: now.pron, heard: '' }
// 帯に出すコーチの返事。頼んでいなければ何も、頼んでいる間は一言、失敗したらその理由
const shown = (coach?: Answer | null) =>
  coach === undefined ? undefined : coach === null ? '聞いています…' : Result.given(coach).either<Coached | undefined>(Restatements.of, error => `コーチできませんでした：${error}`)
