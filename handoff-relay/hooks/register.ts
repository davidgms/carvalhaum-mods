import type { EngineInterface, Register } from 'claude-code'

import { handoffFrom } from './handoff'

// Wait after the turn ends, so /clear runs on an idle session.
const SETTLE_MS = 300

// The `send` option: send the handoff after /clear instead of only pasting it.
let isSending = false

// The same file and the same tool order as the /copy skill, so the clipboard
// holds the Markdown source of the answer, not a rendered copy.
const COPY_FILE = '/tmp/claude-copy-output.txt'
const COPY_SCRIPT = 'wl-copy < "$1" || xclip -selection clipboard < "$1" || xsel --clipboard --input < "$1"'

async function copy($: EngineInterface, text: string): Promise<boolean> {
  const saved = await $.fs.write(COPY_FILE, text).then(() => true, () => false)
  if (saved) {
    const run = await $.process.run(['sh', '-c', COPY_SCRIPT, 'sh', COPY_FILE], { timeoutMs: 5_000 }).catch(() => null)
    if (run?.exitCode === 0) return true
  }
  const copied = await $.ui.copy({ text }).catch(() => ({ isCopied: false }))
  return copied.isCopied
}

async function relay($: EngineInterface, handoff: string): Promise<void> {
  const isCopied = await copy($, handoff)
  await $.command.run({ command: 'clear' })
  const copyNote = isCopied ? 'copied' : 'not copied (the clipboard failed)'
  if (isSending) {
    await $.prompt.submit({ text: handoff, asUser: true })
    $.ui.toast(`Handoff ${copyNote} and sent to the new session.`)
    return
  }
  await $.prompt.fill({ text: handoff, mode: 'replace' })
  $.ui.toast(`Handoff ${copyNote} and pasted. Press Enter to send it.`)
}

export const register: Register = (on, options) => {
  isSending = options?.send === 'on'

  // The trigger is the answer itself, not the skill: Team accounts seat the
  // built-in cc-plugin-sec-default first, and it keeps skill.prompt (prompt
  // content) away from installed plugins, so a skill.prompt hook never runs.
  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    if (e.agentId !== undefined || e.isAborted) return done
    const handoff = handoffFrom(e.answer)
    if (!handoff) return done
    $.clock.after(SETTLE_MS, () => {
      void relay($, handoff).catch(err => $.ui.toast(`Handoff relay stopped: ${err instanceof Error ? err.message : String(err)}`))
    })
    return done
  })
}
