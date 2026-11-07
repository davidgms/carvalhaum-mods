import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Hud } from '../types'

const hud = atom({ plugin: 'usage-hud', key: 'hud' } as const, null)
const tick = atom({ plugin: 'usage-hud', key: 'tick' } as const, 0)
const enabled = atom({ plugin: 'usage-hud', key: 'enabled' } as const, true)

const kilo = (n: number): string =>
  n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`

const left = (iso: string | undefined, now: number): string => {
  if (!iso) return ''
  const ms = Date.parse(iso) - now
  if (!(ms > 0)) return 'resetting'
  const m = Math.ceil(ms / 60000)
  return m >= 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}m` : `${m}m`
}

const bar = (percent: number, width: number): string => {
  const filled = Math.max(0, Math.min(width, Math.round((percent / 100) * width)))
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

export const register: Register = on => {
  on('session.measure', async ($, e, next) => {
    const w = e.rateLimits.find(r => r.kind === 'five_hour')
    const value: Hud = {
      tokens: e.context.tokens ?? null,
      window: e.context.window,
      limit: w ? { percent: w.percentUsed, resetsAt: w.resetsAt } : null,
    }
    await update($, hud, () => value)

    return next(e)
  })

  // Redraw once a minute so the reset timer counts down.
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'ctx-usage-bar',
      description: 'Turn the context and usage bar above the prompt on or off',
    })
    const saved = await $.store.get('enabled')
    await update($, enabled, () => saved !== false)

    void (async () => {
      for (;;) {
        try {
          await $.clock.sleep(60000)
          await update($, tick, n => n + 1)
        } catch {
          return
        }
      }
    })()

    return next(e)
  })

  on('command.run', { command: 'ctx-usage-bar' }, async $ => {
    const next = !(await read($, enabled))
    await update($, enabled, () => next)
    await $.store.set('enabled', next)

    return { text: `Context and usage bar ${next ? 'on' : 'off'}.` }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || !(await read($, enabled))) return next(e)

    await read($, tick)
    const snap = await read($, hud)
    const model = await $.session.model()
    const now = await $.clock.now()
    const { Box, Text } = $.ui.resolve(e)

    const ctx = snap
      ? `${snap.tokens === null ? '?' : kilo(snap.tokens)}/${kilo(snap.window)}`
      : '?/?'
    const pct = snap?.limit?.percent
    const color = pct === undefined ? undefined : pct >= 90 ? 'red' : pct >= 70 ? 'yellow' : 'green'

    return (
      <Box>
        <Text dimColor>ctx </Text>
        <Text>{ctx}</Text>
        <Text dimColor> | </Text>
        <Text>{model}</Text>
        {snap?.limit ? (
          <Text>
            <Text dimColor> | </Text>
            <Text color={color}>{bar(snap.limit.percent, 10)}</Text>
            <Text> {Math.round(snap.limit.percent)}%</Text>
            <Text dimColor> resets {left(snap.limit.resetsAt, now)}</Text>
          </Text>
        ) : null}
      </Box>
    )
  })
}
