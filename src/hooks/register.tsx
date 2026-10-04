import type { Register } from 'claude-code'

import { grass } from './features/grass/grass'
import { learning } from './features/learning/learning'
import { settings } from './features/settings/settings'

export const register: Register = on => {
  settings(on)
  learning(on)
  grass(on)
}
