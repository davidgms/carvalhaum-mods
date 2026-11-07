import { expect, mock, test } from 'claude-code/testing'

const HANDOFF = '# Session Handoff - X\n\n## Where it started\nA'

test('send off: an answer opening with the heading is copied, cleared and pasted, in that order', { options: { send: 'off' } }, async ($, on) => {
  const steps: string[] = []
  const clock = mock.clock(on)
  on('ui.copy', ($, e) => (steps.push(`copy:${e.text}`), { value: { isCopied: true } }) as never)
  on('command.run', ($, e) => (steps.push(`run:${e.command}`), { text: '' }) as never)
  on('prompt.fill', ($, e) => (steps.push(`fill:${e.text}`), { isFilled: true }) as never)
  on('prompt.submit', ($, e) => (steps.push(`submit:${e.text}`), { text: e.text }) as never)
  on('ui.toast', () => ({ value: undefined }) as never)
  on('turn.complete', ($, e) => ({ text: e.answer }) as never)

  await $.turn.complete({ answer: HANDOFF, isAborted: false, reason: 'end_turn', turnId: 't1', durationMs: 1 } as never)
  await clock.advance(400)

  expect(steps).toEqual([`copy:${HANDOFF}`, 'run:clear', `fill:${HANDOFF}`])
})


test('send on (the default): copied, cleared and sent as the person\'s own prompt, not pasted', async ($, on) => {
  const steps: string[] = []
  const clock = mock.clock(on)
  on('ui.copy', ($, e) => (steps.push(`copy:${e.text}`), { value: { isCopied: true } }) as never)
  on('command.run', ($, e) => (steps.push(`run:${e.command}`), { text: '' }) as never)
  on('prompt.fill', ($, e) => (steps.push(`fill:${e.text}`), { isFilled: true }) as never)
  on('prompt.submit', ($, e) => (steps.push(`submit:${e.text}:${e.origin.kind === 'plugin' && e.origin.asUser === true}`), { text: e.text }) as never)
  on('ui.toast', () => ({ value: undefined }) as never)
  on('turn.complete', ($, e) => ({ text: e.answer }) as never)

  await $.turn.complete({ answer: HANDOFF, isAborted: false, reason: 'end_turn', turnId: 't1', durationMs: 1 } as never)
  await clock.advance(400)

  expect(steps).toEqual([`copy:${HANDOFF}`, 'run:clear', `submit:${HANDOFF}:true`])
})


test('an ordinary answer clears nothing', async ($, on) => {
  const steps: string[] = []
  const clock = mock.clock(on)
  on('command.run', ($, e) => (steps.push(`run:${e.command}`), { text: '' }) as never)
  on('turn.complete', ($, e) => ({ text: e.answer }) as never)

  await $.turn.complete({ answer: 'I changed 3 files.', isAborted: false, reason: 'end_turn', turnId: 't1', durationMs: 1 } as never)
  await clock.advance(400)

  expect(steps).toEqual([])
})

test('a subagent answer that opens with the heading clears nothing', async ($, on) => {
  const steps: string[] = []
  const clock = mock.clock(on)
  on('command.run', ($, e) => (steps.push(`run:${e.command}`), { text: '' }) as never)
  on('turn.complete', ($, e) => ({ text: e.answer }) as never)

  await $.turn.complete({ answer: HANDOFF, isAborted: false, reason: 'end_turn', turnId: 't1', durationMs: 1, agentId: 'a1' } as never)
  await clock.advance(400)

  expect(steps).toEqual([])
})

test('the copy goes the /copy way: the Markdown is written to the file and piped to the clipboard tools', async ($, on) => {
  const steps: string[] = []
  const clock = mock.clock(on)
  on('fs.write', ($, e) => (steps.push(`write:${e.path}:${e.text}`), { value: undefined }) as never)
  on('process.run', ($, e) => (steps.push(`run:${e.argv[2]}`), { value: { exitCode: 0, stdout: '', stderr: '' } }) as never)
  on('ui.copy', () => (steps.push('ui.copy'), { value: { isCopied: true } }) as never)
  on('command.run', ($, e) => (steps.push(`cmd:${e.command}`), { text: '' }) as never)
  on('prompt.fill', () => ({ isFilled: true }) as never)
  on('ui.toast', () => ({ value: undefined }) as never)
  on('turn.complete', ($, e) => ({ text: e.answer }) as never)

  await $.turn.complete({ answer: HANDOFF, isAborted: false, reason: 'end_turn', turnId: 't1', durationMs: 1 } as never)
  await clock.advance(400)

  expect(steps).toEqual([
    `write:/tmp/claude-copy-output.txt:${HANDOFF}`,
    'run:wl-copy < "$1" || xclip -selection clipboard < "$1" || xsel --clipboard --input < "$1"',
    'cmd:clear',
  ])
})
