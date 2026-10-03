import type { Answer, Completion } from '../../engine-protocol'
import { Result } from '../result/result'

// --- public interface
export const Answers = {
  of: (completion: Promise<Completion>) => of(completion),
}

// --- operations
// 返事が来れば下書きを捨てた文面、来なければその理由。呼び出し自体が拒まれたときは、その message
const of = async (completion: Promise<Completion>): Promise<Answer> => (await Result.given(completion)).and(answered).and(withoutScratch).either<Answer>(value => ({ ok: true, value }), error => ({ ok: false, error }))

// --- business rules
// 返事が来れば、その文面。来なければ、その理由で失敗
const answered = (c: Completion) => (c.isAnswered ? c.text : Result.fail(c.reason))
// 頭にあるモデルの下書き（<think> などで囲んだ考え）は捨て、写した <message> の囲み（頭の 1 つと最後の閉じ）も外す。文面の中のタグは残す
const withoutScratch = (text: string) => text.trim().replace(/^<(think|thinking|reasoning|scratchpad)>[\s\S]*?<\/\1>/, '').trim().replace(/^<message>([\s\S]*)<\/message>/, '$1').trim()
