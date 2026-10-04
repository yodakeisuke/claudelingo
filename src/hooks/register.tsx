import type { Register } from 'claude-code'

import { PromptTranslations } from '../logic/prompt-translation/prompt-translation'
import { counted } from './features/grass/grass'
import { abovePrompt, assistantMessage, edited, replyPaneDrawn, submitted, userMessage } from './features/learning/learning'
import { lingoRun, settingsPaneDrawn, started } from './features/settings/settings'
import { REPLY_PANE } from './ui/reply-translation/reply-translation'
import { SETTINGS_PANE } from './ui/settings-pane/settings-pane'

// ディレクトリの審査は、on の登録がこのファイルに 1 行ずつ並んでいないと読めない
export const register: Register = on => {
  on('session.start', started)
  on('command.run', { command: 'lingo' }, lingoRun)
  on('ui.render', { component: 'Pane', requestId: SETTINGS_PANE }, settingsPaneDrawn)
  on('prompt.submit', submitted)
  on('prompt.edit', edited)
  on('ui.render', { component: 'AbovePrompt' }, abovePrompt)
  on('ui.render', { component: 'UserMessage' }, userMessage)
  on('ui.render', { component: 'AssistantMessage' }, assistantMessage)
  on('ui.render', { component: 'Pane', requestId: REPLY_PANE }, replyPaneDrawn)
  on('prompt.submit', { origin: PromptTranslations.ownOrigins() }, counted)
}
