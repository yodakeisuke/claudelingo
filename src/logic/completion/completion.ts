import type { Completion, Translation } from '../../engine-protocol'
import { Result } from '../result/result'

// --- public interface
export const Completions = {
  of: (reply: Promise<Completion>) => of(reply),
}

// --- operations
// 返事が来れば下書きを捨てた文面、来なければその理由。呼び出し自体が拒まれたときは、その message
const of = async (reply: Promise<Completion>): Promise<Translation> => (await Result.given(reply)).and(answered).and(withoutScratch).either<Translation>(value => ({ ok: true, value }), error => ({ ok: false, error }))

// --- business rules
// 返事が来れば、その文面。来なければ、その理由で失敗
const answered = (c: Completion) => (c.isAnswered ? c.text : Result.fail(c.reason))
// モデルの下書き（<think> などで囲んだ考え）は捨て、残ったタグも外す。文面だけを残す
const withoutScratch = (text: string) => text.replace(/<(think|thinking|reasoning|scratchpad)>[\s\S]*?<\/\1>/g, '').replace(/<\/?(message|think|thinking|reasoning|scratchpad)>/g, '').trim()
