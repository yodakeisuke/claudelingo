import type { Register } from 'claude-code'

import { grass } from './features/grass/grass'
import { settings } from './features/settings/settings'
import { translation } from './features/translation/translation'

export const register: Register = on => {
  settings(on)
  translation(on)
  grass(on)
}
