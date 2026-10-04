# claudelingo

[日本語](README.ja.md) | English

Keep using Claude Code as usual, and the version of each prompt in the language you're learning appears right below it. Proofreading while you type, reply translations, intuitive diagrams of a word's core image, read-aloud, and speaking practice are there too, without stopping your work.

- Your prompts and Claude's replies stay exactly as they are
- Sending is never delayed
- No extra cost on a subscription plan (it counts toward your plan's usage)

**Contents**

- **Getting started**: [What you need](#what-you-need) · [Install](#install) · [What shows up where](#what-shows-up-where)
- **Features**: [After sending](#after-sending) · [While typing](#while-typing) · [Reply translation](#reply-translation) · [Word pictures](#word-pictures) · [Read aloud](#read-aloud) · [Practice speaking](#practice-speaking) · [Writing graph](#writing-graph)
- **Settings and management**: [Change settings](#change-settings) · [Turn off, update, uninstall](#turn-off-update-uninstall) · [What is sent to Claude](#what-is-sent-to-claude) · [Choosing a model](#choosing-a-model) · [Where it shows](#where-it-shows) · [What is kept](#what-is-kept)
- **Troubleshooting**: [By symptom](#by-symptom) · [By message](#by-message) · [Still stuck](#still-stuck)

## Getting started

### What you need

- Claude Code v2.1.287 or later (check with `claude --version`)
- `claude` in a terminal, or the Code tab of the Desktop app
- A Mac, if you want read-aloud

> [!WARNING]
> **It uses your plan's usage, on top of your main work** (or per-token charges with an API key). You can change the model in `/lingo`. → [What is sent to Claude](#what-is-sent-to-claude) · [Choosing a model](#choosing-a-model)

### Install

1. Run these two lines in your terminal.

   ```bash
   claude plugin marketplace add yodakeisuke/claudelingo
   claude plugin install claudelingo@claudelingo
   ```

   You're done when you see `Successfully installed plugin: claudelingo@claudelingo (scope: user)`. It's installed for both the terminal and Desktop.
2. Restart Claude Code (in an open terminal session, `/reload-plugins` also works; in Desktop, start a new session).
3. Set your languages before your first prompt. Send `/lingo`. The defaults are Japanese → English, so the panel first appears in Japanese. In the first field, **母語** (Native), type your language, for example `English`, and press <kbd>Enter</kbd>: the panel switches to English. Then set **Learning**, for example `Spanish`.
4. Send any prompt. If its version in your learning language appears right below it within a few seconds to 10 seconds, it works.

### What shows up where

The examples on this page are from a native English speaker learning Spanish.

```text
> find out why los tests está fallando, and once they pass, sigue el refactor
  Averigua por qué los tests **están** fallando y, …  🔊 🎤     ← After sending
  ┃ seguir con  /seˈɣiɾ kon/  [animated picture] …              ← Word pictures

● The cause is the old Node version on CI.
  🌐                                                            ← Reply translation

Sample   seguir con                     ✕                       ← Practice speaking
[Replace] Averigua por qué los tests **están** fallando, …  ✕   ← While typing
──────────────────────────────────────────
> averigua por qué los tests está fallando, and once …          ← Prompt input
──────────────────────────────────────────
```

This is the terminal. Desktop lays things out the same way. `**…**` is bold on screen.

| Name | When it appears |
|---|---|
| [After sending](#after-sending) | When you send a prompt (automatic) |
| [While typing](#while-typing) | When you pause while typing (automatic) |
| [Reply translation](#reply-translation) | When you press 🌐 under a reply |
| [Word pictures](#word-pictures) | When you press a word in a translation |
| [Practice speaking](#practice-speaking) | When you press 🎤 |

- Only After sending and While typing run on their own. Everything else runs only when you press it.
- 🔊 reads that text aloud (→ [Read aloud](#read-aloud)). Settings and the writing graph open with `/lingo`.
- In the terminal, buttons can be clicked only in fullscreen rendering (`/tui fullscreen`) (→ [Where it shows](#where-it-shows)).

## Features

### After sending

**Automatic.** Right below each prompt you send, you get how to say it in your learning language, plus takeaways.

```text
> find out why los tests está fallando, and once they pass, sigue el refactor   ← Your prompt (sent as typed)
  Averigua por qué los tests **están** fallando y, cuando pasen,  🔊 🎤
  **sigue con** el refactor.                                                  ← Learning-language version. ** = corrected
  /aβeˈɾiɣwa poɾ ˈke los tests esˈtan faˈʝando …/                             ← Pronunciation (after you press 🔊)

  💡 Tips                                                                     ← Takeaways in your native language (1–2)
  •  Plural subject, plural verb: los tests están, not está
  •  "Keep going with" is seguir con; seguir el refactor means "follow" it
```

- Parts in your native language are translated. Parts you wrote in your learning language are made natural.
- It takes a few seconds to 10 seconds. Nothing shows until then.
- 🔊 on the right reads it aloud and 🎤 starts speaking practice. Press a word to open its word picture.

<details>
<summary>Details</summary>

| Case | Behavior |
|---|---|
| Translated | Prompts you send yourself (terminal, Desktop, Remote Control). A prompt starting with `/` is translated unless it's a command, like `/tmp is full` |
| Not translated | Commands such as `/clear`, notifications, messages from other agents or sessions, prompts sent while it was off |
| Long prompts | Can take tens of seconds (opus too) |
| Pastes and code | Shown as `[...]` in the translation |
| Line breaks | Removed; the text runs on |
| If it fails | Shows "Couldn't translate: reason". It can't be retried (→ [By message](#by-message)) |
| Sending the same prompt again | Translated again with the current settings |
| Removing or copying | A translation can't be removed on its own. In Desktop, its text can't be selected |

</details>

### While typing

**Automatic.** Before you send, you can check and fix how to say it, above the prompt input. Type what you can't say yet in your native language, and it's filled in.

```text
[Replace] Averigua por qué los tests **están** fallando y, cuando pasen,  ✕   ← Proofread version. ** = corrected
          sigue con el refactor.                                              ← Your English part (once they pass) is translated in
          💡 Plural subject, plural verb: los tests están                     ← The one thing to fix first
──────────────────────────────────────────────────────
> averigua por qué los tests está fallando, and once they pass sigue con el refactor
                             ~~~~                                             ← A mistake gets a red underline (one at a time, from the start)
──────────────────────────────────────────────────────
```

1. Type in the prompt input and pause. Within a few seconds, a band appears above the input.
2. To fix it, do one of these:
   - Fix the underlined word yourself (it sticks better). The underline moves to the next mistake.
   - Press **Replace** (faster). The whole input is replaced with the band's text. There's no undo button.
3. Press <kbd>Enter</kbd> to send. The band goes away. To hide only the band, press ✕.

<details>
<summary>Details</summary>

| Case | Behavior |
|---|---|
| When the band appears | After you pause for the Delay (0.5 s by default). Typing again cancels that request |
| Until a new band appears | The previous band stays |
| Replace does nothing | You changed the input after the band appeared. Wait for a new band, then press it |
| Typing a command | Not proofread (when what follows `/` starts a command name) |
| Input cleared | The band goes away |
| Sent by a notification | The band stays (sending it yourself hides it) |
| A survey is showing | Neither the proofreading band nor the practice band appears |
| Practice band also open | Shown below the practice band |
| If it fails | The band shows "Couldn't translate: reason". Typing again retries |
| Terminal keys | <kbd>ctrl</kbd>+<kbd>x</kbd> <kbd>tab</kbd> moves to the band, <kbd>Tab</kbd> selects, <kbd>Enter</kbd> presses. Collapse it with <kbd>ctrl</kbd>+<kbd>x</kbd> <kbd>ctrl</kbd>+<kbd>a</kbd> or `[-]` |

</details>

### Reply translation

**Press 🌐.** Translates Claude's reply paragraph by paragraph into the translation pane. The reply itself doesn't change.

```text
● The cause is the old Node version on CI.
    node-version: 18                            ← Code isn't translated
  Bump it to 20 and run it again.
  🌐                                            ← Opens the translation pane

┃ The cause is the old Node version on CI.      ← The pane. Its first line shows which reply
┃ La causa es la versión antigua de Node en CI. ← Translation, paragraph by paragraph
┃ Súbela a 20 y vuelve a ejecutarlo.
┃ 🔊                                            ← Reads the learning-language side in order
```

1. Press 🌐 under the reply.
2. After "Translating…", the translation appears in a few seconds to tens of seconds.
3. To close it, press the pane's ✕ (or <kbd>ctrl</kbd>+<kbd>x</kbd> <kbd>x</kbd> in the terminal).

<details>
<summary>Details</summary>

| Case | Behavior |
|---|---|
| Direction | A reply mostly in your native language goes into your learning language, and the other way round (automatic) |
| Pressing 🌐 on the same reply again | Shown right away, not translated again. Retried if it had failed |
| After changing languages | Pressing it translates into the new languages |
| 🌐 on another reply | Replaces what the pane shows (one reply at a time) |
| No 🌐 | The block is code only |
| Words you can press | When translating into your learning language and Word pictures is on |
| Where the pane opens | In the terminal: on the right in fullscreen rendering at 110 columns or wider, otherwise above the input |
| After `/clear` and the like | The pane stays open and shows "Press 🌐 under a reply to see its translation here" |
| If it fails | "Couldn't translate: reason". Press 🌐 again to retry |

</details>

### Word pictures

**Press a word.** Press a word in a translation to see its core image as an intuitive, animated diagram. Examples, similar expressions, and its origin are a press away.

```text
  … y, cuando pasen, sigue con el refactor.          ← Press "sigue"
  ┃ seguir con  /seˈɣiɾ kon/  🔊 🎤  [Enlarge]        ← The phrase your word belongs to, with pronunciation
  ┃ [ animated picture ]                             ← The core image, animated (Desktop)
  ┃ The dot clears the bump and keeps going          ← What the picture shows (native language)
  ┃ [Examples] [Similar] [Origin]                    ← Opens below
  ┃ Sigamos con esto después de comer.  🔊            ← An example, its translation, and why this word
  ┃   Let's keep going with this after lunch.
  ┃   A break doesn't stop the flow
```

This is Desktop (the picture is an example). The terminal shows one line instead of the picture.

1. Press a word in a translation. Words you can press are shown in dim text.
2. After "Drawing the core image…", it appears in about 20 to 60 seconds. Meanwhile 🔊, 🎤, and Examples already work.
3. To close it, press the same word again.

<details>
<summary>Details</summary>

| Case | Behavior |
|---|---|
| Phrases | If the word is part of a phrase, the phrase is shown (sigue → seguir con). Pressing any word of the phrase closes it |
| Words you can press | In After sending, and in reply translations into your learning language. Symbols alone can't be pressed. Corrected words and open words show in full color |
| Pressing several | They stack below in the order you pressed them |
| Opening again | The same word in the same sentence shows right away, without redrawing (for this session) |
| Two prompts with the same text | Shown only under the one you pressed |
| Terminal | One line instead of the picture (phrase, pronunciation, sentence, 🔊 🎤). No Enlarge |
| Enlarge | Makes the picture bigger. Shrink puts it back (Desktop only) |
| Examples | Three examples in different scenes, each with a translation and a line on why this word fits. 🔊 on an example also shows its pronunciation |
| Similar | Two or three alternatives and when to pick each |
| Origin | The original meaning of its parts and how they lead to today's meaning. Says so when there's no established account |
| Opening and closing Examples and the rest | Appears after "Writing…", within 60 seconds. Press again to close; opening again writes it anew (and uses usage) |
| Closing the word picture | Also closes its Examples and the rest |
| If it fails | "Couldn't draw: sigue" or "Couldn't write" (→ [By message](#by-message)) |

</details>

### Read aloud

**Press 🔊.** Reads the text there aloud in a Mac voice.

| Where 🔊 is | What it reads | Pronunciation |
|---|---|---|
| Next to After sending | The translation | Shown below it |
| Bottom of the translation pane | Learning-language paragraphs in order | Shown for each paragraph |
| Word picture | The phrase | Already there |
| Example | That example | Shown below it |
| **🔊 Sample** in the practice band | The sample | — |

- Pick the voice in **Voice** in `/lingo` (Samantha by default). For a language other than English, enter a Mac voice for that language, for example `Mónica` for Spanish.
- Pressing again queues it after the current one. It can't be stopped midway.
- If it can't read, you see "Couldn't read aloud: reason".

<details>
<summary>Details</summary>

| Case | Behavior |
|---|---|
| Voice names | Find and add them in System Settings › Accessibility › Spoken Content (Read & Speak on macOS 26). Leave the field empty for the default voice |
| Pronunciation | Written only the first time ("Writing the pronunciation…"). If it fails it disappears, and the next press writes it again |
| Where the sound plays | The Mac running Claude Code |
| Length | Up to 4,096 characters per paragraph |

</details>

### Practice speaking

**Press 🎤.** Say the sample out loud, and a coach tells you which sounds didn't come across and how to fix them.

> [!NOTE]
> **Before you start**: turn on Dictation on your Mac and add your learning language (System Settings › Keyboard › Dictation). claudelingo never hears your microphone; it only uses the text Dictation types.

```text
Sample   seguir con  /seˈɣiɾ kon/             ✕   ← What to say
Try      [según con                ] ?            ← Speak with Dictation, then Enter
Heard    según con                                ← Words that didn't come across (según) are underlined in red
💡 The r in seguir is one quick tap of the tongue, not an English r   ← How to fix it (1–3 tips in your native language)
💡 Stress the last syllable: se-GUIR
[🔊 Sample] [Again]                               ← Hear the sample / try again
────────────────────────────
>                                                 ← Prompt input (the band sits above it)
────────────────────────────
```

1. Press 🎤 in After sending or on a word picture. The practice band opens above the input.
2. Move to the **Try** field (Desktop starts there; in the terminal press <kbd>ctrl</kbd>+<kbd>x</kbd> <kbd>tab</kbd>).
3. Start Dictation and say the sample out loud.
4. Press <kbd>Enter</kbd>. In a few seconds, **Heard** and the 💡 tips appear.

<details>
<summary>Details</summary>

| Case | Behavior |
|---|---|
| Starting Dictation | The shortcut in System Settings › Keyboard › Dictation (for example, press fn twice) |
| <kbd>Enter</kbd> with an empty field | Nothing happens |
| Typed with the keyboard | What you typed is compared with the sample |
| Closing | ✕, or press the same 🎤 again |
| Another 🎤 | Replaces the band. Coaching still on its way is dropped |
| Where the text goes | Not into the conversation. It's sent to Claude for coaching |
| claudelingo turned off | The band goes away |
| If it fails | "Couldn't coach: reason". Press <kbd>Enter</kbd> again |

</details>

### Writing graph

**Below /lingo.** How many words you wrote yourself, one square per day, read like GitHub's contribution graph.

```text
Jun     Jul     Aug       Sep
· · · · · · · ▒ · · · ▒ · ░ · ▒ · ·
· ░ ░ · ░ ▒ · ░ ░ · · · ▒ ▒ ▒ ▒ █
· ▒ ▒ · ░ · · ░ ░ · ░ ▒ ░ ▒ · ▒ ░
· · · ▒ · · ░ ▒ ▒ ▒ ▒ ░ ░ · █ █ ▒
· ▒ ▒ · ░ ▒ · ▒ ░ ░ · · ░ ▒ ░ ▒ █
· · · · ░ · · · · · · · · █ ▒ █ █
· · · · · ▒ · · · · ▒ ▒ ░ · · ▒ ·
3,482 words you wrote yourself                  ← Total so far
```

This is the terminal (on screen, the squares are shades of green). Desktop shows a full year as one picture. Shades: `·` 0 words / `░` 1–99 / `▒` 100–249 / `█` 250 or more

| Counted | Not counted |
|---|---|
| Prompts you send yourself while claudelingo is on | Text in `` ` ``, code blocks, pastes |
| Words in Latin letters in them (don't is one word) | Commands such as `/clear` |
| File names and URLs too | Anything not in Latin letters |

> [!NOTE]
> It counts every word in Latin letters, so if your native language uses them too, your native-language words count as well. If your learning language isn't written in Latin letters (Chinese, Korean, Russian, and so on), the graph doesn't grow.

<details>
<summary>Details</summary>

| Case | Behavior |
|---|---|
| Which day a square is | Your computer's date. Rows run Sunday to Saturday; the rightmost column is this week |
| How far back | As many weeks as fit in the terminal; a full year in Desktop |
| Record | Kept on your computer, adding up every session. There's no way to clear it from the screen (→ [What is kept](#what-is-kept)) |

</details>

## Settings and management

### Change settings

**/lingo.** The defaults are Japanese → English. Until you set **Native** to something other than Japanese, the panel is in Japanese.

```text
claudelingo     ● On   [Turn off]                ← Master switch
General
  Native        English                          ← A language name, e.g. Spanish
  Learning      Spanish
  Level         e.g. I read technical docs fine; …  ← Your strengths and weak spots, in your words
  Model         [haiku] [*sonnet*] [opus]        ← Model for translations and more (* = selected)
After sending   ● On   [Turn off]                ← Per-feature switches
While typing    ● On   [Turn off]
  Model         [haiku] [*sonnet*] [opus]
  Delay         Fast [-] 0.5 s [+] Slow          ← How long a pause before proofreading
Word pictures   ● On   [Turn off]
  Model         [haiku] [*sonnet*] [opus]
Read aloud
  Voice         Mónica                           ← A Mac voice name
(graph) 3,482 words you wrote yourself           ← Writing graph
```

1. Send `/lingo`. It opens even while Claude is working.
2. Change things. Buttons save when you press them; text fields save on <kbd>Enter</kbd>.
3. Close it with <kbd>Esc</kbd>.

- Changes apply from the next translation. Translations already shown don't change.
- Settings are shared by every session and project on your computer.
- If saving fails, you see "Couldn't save: reason" in red and the value doesn't change.

<details>
<summary>Field details</summary>

| Field | Rule |
|---|---|
| Native, Learning | Pressing <kbd>Enter</kbd> on an empty field changes nothing |
| Screen language | Japanese while Native is Japanese or 日本語; any other language name switches it to English |
| Level | Translations, tips, pictures, and coaching are pitched to it. Left empty, nothing is passed on |
| General › Model | Used for After sending, Reply translation, pronunciation, coaching, Examples and the rest (→ [Choosing a model](#choosing-a-model)) |
| Delay | 0.3 to 2 seconds. [-] and [+] move it by 0.1 s. Out-of-range numbers are clamped; anything that isn't a number is ignored |
| Voice | Empty means the Mac's default voice |
| A group turned off | Shows only its heading. Turning claudelingo off hides everything below it, including the writing graph |
| Text fields | Leaving without pressing <kbd>Enter</kbd> doesn't save |
| Terminal keys | <kbd>Tab</kbd> moves between fields; <kbd>Enter</kbd> presses or confirms |

</details>

### Turn off, update, uninstall

| To | Do this | Result |
|---|---|---|
| Stop everything | `/lingo` › claudelingo **Turn off** | Stops right away. Translations already shown stay |
| Stop one feature | That feature's **Turn off** | Only that feature stops |
| Update | `claude plugin update claudelingo@claudelingo`, then restart | Runs the new version |
| Uninstall | `claude plugin uninstall claudelingo@claudelingo`, then restart | Settings and the writing graph stay on your computer |

<details>
<summary>What turning off does</summary>

| Case | Behavior |
|---|---|
| claudelingo off | No more calls to Claude and no more counting. Buttons and word pictures are hidden; 🌐, the bands, and the writing graph don't show. **Turn on** brings it all back |
| After sending off | New prompts aren't translated. 🌐 and the rest still work |
| While typing off | The band goes away at once and drafts aren't sent |
| Word pictures off | Words can't be pressed, and open word pictures are hidden |
| Automatic updates | Off by default. Turn on with `/plugin` › Marketplaces › claudelingo › Enable auto-update |

</details>

### What is sent to Claude

claudelingo calls Claude at these moments, and each call uses usage.

| When | What is sent | How often |
|---|---|---|
| You send a prompt | That prompt | Once |
| You pause while typing | Your draft (including text you later delete) | Every pause |
| You press 🌐 | That reply (without code) | Once per reply |
| You press a word | That word and its sentence | Once per new word (heavier) |
| You open Examples and the rest | That word and its sentence | Every time you open one |
| You press 🔊 | The text to read (for its pronunciation) | First time per text |
| You press <kbd>Enter</kbd> in practice | The sample and what's in the Try field | Once |

- It goes only to Claude, through the same account as your Claude Code. It doesn't enter your conversation with Claude.
- To use less: pick haiku; turn While typing off or lengthen the Delay; turn off features you don't use.

### Choosing a model

| Model | Best for |
|---|---|
| haiku | Fast and light on usage. Translations and pictures may be weaker |
| sonnet | The default. A good balance of speed and quality |
| opus | The best quality. Slower and heavier on usage |

| Setting in `/lingo` | Used for |
|---|---|
| General › Model | After sending, Reply translation, pronunciation, coaching for Practice speaking, Examples and the rest |
| While typing › Model | While typing |
| Word pictures › Model | Word pictures |

Each one always uses the latest model of that family.

### Where it shows

| | Terminal (fullscreen) | Terminal (classic) | Desktop |
|---|:-:|:-:|:-:|
| Translations, bands, panes | ✓ | ✓ | ✓ |
| Buttons under prompts and replies (🔊 🎤 🌐, words) | Click | Can't press | Click |
| Bands and panes | Click, keys | Keys | Click |
| Core-image pictures, the graph picture | Text | Text | ✓ |
| Button hints on hover | ✓ | — | ✓ |

- Fullscreen rendering keeps the prompt input fixed at the bottom of the screen. Check with `/tui` and switch with `/tui fullscreen` (your conversation is kept).
- Not shown in: the VS Code extension's chat panel, `claude -p`, cloud sessions, WSL sessions in Desktop. In VS Code, run `claude` in the integrated terminal instead.
- Prompts sent over Remote Control (phone or browser) are translated too, and shown on your computer.

<details>
<summary>Keyboard</summary>

| To | Keys |
|---|---|
| Move to a band or pane | <kbd>ctrl</kbd>+<kbd>x</kbd> <kbd>tab</kbd> |
| Select and press | <kbd>Tab</kbd>, then <kbd>Enter</kbd> |
| Back to the input | <kbd>Esc</kbd> |
| Close a pane | <kbd>ctrl</kbd>+<kbd>x</kbd> <kbd>x</kbd> |

</details>

### What is kept

| What | How long |
|---|---|
| Settings and the writing graph | Saved on your computer, shared by every session and project. Deleted if you don't start Claude Code with claudelingo for 30 days |
| Translations, word pictures, pronunciation, reply translations, practice | This session only. Gone after `/clear`, `/resume`, `/branch`, or a restart, and can't be brought back |

<details>
<summary>Details</summary>

| Case | Behavior |
|---|---|
| Where 30 days comes from | Claude Code's `cleanupPeriodDays` (30 by default) |
| Several sessions at once | The last settings change applies everywhere. The writing graph adds up every session |
| Conversation record | Translations and pictures don't enter your conversation record with Claude |

</details>

## Troubleshooting

### By symptom

<details>
<summary>Nothing appears under my prompt</summary>

1. Wait about 10 seconds (nothing shows until it's ready).
2. In `/lingo`, check that claudelingo and After sending are on.
3. Check that it isn't a prompt that's never translated, such as a command or a notification (→ the details under [After sending](#after-sending)).
4. Check that you aren't somewhere it doesn't show, such as the VS Code chat panel (→ [Where it shows](#where-it-shows)).
5. If `/lingo` doesn't exist, see the next item.

</details>

<details>
<summary>There's no /lingo</summary>

1. Check that `claude --version` is 2.1.287 or later.
2. Check that you restarted Claude Code after installing.
3. Open `/plugin` and check that claudelingo is on its "mod active" line.

</details>

<details>
<summary>Clicking buttons in the terminal does nothing</summary>

1. Switch to fullscreen rendering with `/tui fullscreen` (classic rendering can't click).
2. In tmux, set `set -g mouse on`; in iTerm2, turn on Enable mouse reporting.
3. Unset `CLAUDE_CODE_DISABLE_MOUSE` or `CLAUDE_CODE_DISABLE_MOUSE_CLICKS` if you set them.

</details>

<details>
<summary>No band above the input</summary>

- While typing is off
- You're typing a command
- You closed it with ✕ and haven't typed since
- A Claude Code survey is showing

</details>

<details>
<summary>Replace does nothing</summary>

You changed the input after the band appeared. Pause, wait for a new band, then press it.

</details>

<details>
<summary>There's no 🌐</summary>

- claudelingo is off
- The block is code only (nothing to translate)

</details>

<details>
<summary>I can't press words in a translation</summary>

- Word pictures is off
- It's a translation into your native language (only translations into your learning language can be pressed)
- It's only symbols

</details>

<details>
<summary>I hear nothing when I press 🔊</summary>

- If "Couldn't read aloud" appears → [By message](#by-message)
- If nothing appears, check your Mac's volume and output (Bluetooth and so on)

</details>

<details>
<summary>Dictation types in my native language</summary>

Set Dictation's language to your learning language (System Settings › Keyboard › Dictation).

</details>

<details>
<summary>Translations or pictures disappeared</summary>

They're gone after `/clear`, `/resume`, `/branch`, or a restart, and can't be brought back.

</details>

<details>
<summary>The writing graph doesn't grow, or grows too much</summary>

- Doesn't grow: your learning language isn't written in Latin letters, or claudelingo is off
- Too much: file names, URLs, and native-language words in Latin letters count too. Text in `` ` `` doesn't count

</details>

<details>
<summary>Usage goes down fast</summary>

Mostly While typing (one call every time you pause). Pick haiku, lengthen the Delay, or turn it off.

</details>

<details>
<summary>My settings went back to the defaults</summary>

They're deleted if you don't use claudelingo for 30 days (→ [What is kept](#what-is-kept)).

</details>

### By message

| Message | Cause | What to do |
|---|---|---|
| Couldn't translate: api-error（rate_limit） | Usage limit reached | Wait until your limit resets |
| Couldn't translate: api-error（overloaded） / （server_error） | Claude is busy or having trouble | Wait a little and retry |
| Couldn't translate: api-error（authentication_failed） and other sign-in or account errors | Sign-in or account | Check that Claude Code itself responds; if not, `/login` |
| Couldn't translate: api-error（model_not_found） / （invalid_request） | That model isn't available to you | Change the model in `/lingo` |
| Couldn't translate: api-error（max_output_tokens） | Too long | Split it up |
| Couldn't translate: empty-reply / aborted / format / api-error（unknown） | A temporary failure | Retry (below) |
| Couldn't translate: (any other text) | The request was refused (for example, by your organization) | Change the model in `/lingo` |
| Couldn't draw: ‹word› | Not drawn within 90 seconds, a cause above, or an unrelated phrase or unsafe picture came back | Press the word twice (close, then open) |
| Couldn't write | Not written within 60 seconds, or a cause above | Press that button twice |
| Couldn't coach: ‹reason› | Same as Couldn't translate | Press <kbd>Enter</kbd> again |
| Couldn't read aloud: ‹reason› | Wrong voice name, voice not installed, not a Mac, or a paragraph over 4,096 characters | Check **Voice**. Empty means the default voice |
| Couldn't save: ‹reason› | Settings can't be written to disk | Check free space and write access to `~/.claude` |

**How to retry**

- After sending: can't be retried. The next prompt you send is translated.
- While typing: type again and pause.
- Reply translation: press 🌐 again.
- Pronunciation: press 🔊 again.

### Still stuck

Open an issue at [GitHub Issues](https://github.com/yodakeisuke/claudelingo/issues) with the exact message you saw, the output of `claude --version`, and whether you use the terminal or Desktop.

## License

[MIT](LICENSE)
