/** The heading the session-handoff skill's template opens with. */
export const HANDOFF_HEADING = '# Session Handoff'

/** The handoff, when a turn's final answer is one: it opens with the heading. */
export function handoffFrom(answer: string): string | null {
  const text = answer.trim()
  return text.startsWith(HANDOFF_HEADING) ? text : null
}
