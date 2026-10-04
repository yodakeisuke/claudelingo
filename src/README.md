# claudelingo

Practice a language while you work in Claude Code. Each prompt you send gets a version in the language you're learning, right below it, with one or two tips. Your prompts and Claude's replies stay as they are, and nothing waits on it.

## Install

```bash
claude plugin marketplace add yodakeisuke/claudelingo
claude plugin install claudelingo@claudelingo
```

Restart Claude Code, then send `/lingo` to set your native and learning languages. The defaults are Japanese → English.

## Use

- **After sending** (automatic): your prompt in the learning language, corrections in bold, plus tips.
- **While typing** (automatic): pause, and a proofread version appears above the input. **Replace** swaps it in.
- **🌐** under a reply: a paragraph-by-paragraph translation in a side pane.
- **Press a word**: an animated picture of its core meaning (Desktop), with examples and origin.
- **🔊** reads aloud with pronunciation. **🎤** opens speaking practice.

## Requirements

- Claude Code v2.1.287 or later, in the terminal or the Desktop app's Code tab
- A Mac for read-aloud

## Privacy and usage

claudelingo sends text only to Claude, through your own Claude Code account, and makes no other network calls. Each call counts toward your plan's usage, or API billing.

| When | Sent to Claude |
|---|---|
| You send a prompt | That prompt |
| You pause while typing | Your draft, including text you later delete |
| You press 🌐, a word, 🔊, or practice | That reply, the word and its sentence, or the text |

On disk it keeps only your settings and daily word counts for the writing graph. Translations and pictures last for the session and never enter your conversation with Claude. To use less, turn features off or pick haiku in `/lingo`.

[Full guide](https://github.com/yodakeisuke/claudelingo#readme) · MIT License
