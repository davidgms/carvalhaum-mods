import { expect, test } from 'claude-code/testing'

import { handoffFrom } from '../hooks/handoff'

test('an answer that opens with the heading is the handoff, whole', async () => {
  expect(handoffFrom('\n# Session Handoff - X\n\n## Where it started\nA\n')).toBe('# Session Handoff - X\n\n## Where it started\nA')
})

test('an answer that only mentions the heading later is not a handoff', async () => {
  expect(handoffFrom('The relay looks for `# Session Handoff` at the start.')).toBeNull()
  expect(handoffFrom('Done.\n\n# Session Handoff - X')).toBeNull()
})
