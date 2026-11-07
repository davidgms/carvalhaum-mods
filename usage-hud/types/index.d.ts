export type Hud = {
  tokens: number | null
  window: number
  limit: { percent: number; resetsAt?: string } | null
}

declare module 'claude-code' {
  interface PluginState {
    'usage-hud': { hud: Hud | null; tick: number; enabled: boolean }
  }
}
