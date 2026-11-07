# agents-at-work

A Claude Code mod: a progress bar above the prompt and a live panel of every subagent.
Fork of [savvy-progress](https://github.com/johnnyvizz/claude-kit/tree/main/plugins/savvy-progress) by johnnyvizz, MIT licence.

- **Progress bar**: task title, phase, accepted tasks out of planned, and a crew-size button that opens the panel. It appears when any subagent starts or something calls the progress tool.
- **Agents panel** (`/agents-info` toggles it): running, finished and planned subagents with model, effort, task progress, context, estimated cost and time. It opens by itself when a subagent starts.

## Tools it adds

- `mcp__agents-at-work__progress`: the orchestrator reports the plan, phase and accepted tasks.
- `mcp__agents-at-work__step`: a subagent reports its own steps (`done`, `total`, `note`).

Cost is a rough estimate from token counts and the `PRICES` table in `hooks/register.tsx`, not a bill.

## Settings

`language`: `auto` (default), `en` or `ru`. Set it in `/config`.

## Install

```
/plugin install agents-at-work --marketplace davidgms/carvalhaum-mods
```
