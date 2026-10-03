// --- public interface
export const Learner = {
  context: (settings: Settings) => context(settings),
}

// --- I/O
type Settings = { native: string; target: string; level: string }

// --- business rules
// どの頼み事も、学ぶ人が誰かをここで一度だけ伝える。レベルは本人の自己申告として渡し、どう合わせるかは頼み事ごとのモデルに任せる。空欄なら伝えない
const context = ({ native, target, level }: Settings) => [
  `The learner is a ${native} speaker learning ${target}.`,
  ...(level ? [`Self-described ${target} level: "${level}". Calibrate everything you produce to it.`] : []),
].join('\n')
