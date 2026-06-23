# Jacob Kesher — Claude Instructions

## Project Overview

Text adventure game in the spy thriller genre. Player is Jacob Kesher, a field agent infiltrating a villain's lair. Stealth-first with D20-style skill checks for combat, sneaking, and dialogue.

## Development Commands

```bash
npm install        # install dependencies
npm run dev        # start Vite dev server
npm run build      # production build
npm run test       # run Vitest unit tests
npm run lint       # run ESLint
```

## Architecture

The engine is a pure function (`processAction`) that takes an action and current `GameState` and returns a new `GameState` plus narrative messages. The renderer only calls `processAction` — it contains no game logic. Game content (rooms, items, enemies) lives in JSON files loaded at startup. See Engine Architecture and Project Structure sections for detail.

## Tech Stack

- TypeScript + Vite
- Vanilla DOM (no framework)
- JSON files for all game data (rooms, items, enemies, dialogue)
- File download/upload for save system (no backend, no localStorage)

## Project Structure

```
jacob-kesher/
├── src/
│   ├── engine/
│   │   ├── index.ts        — processAction, main pipeline
│   │   ├── movement.ts     — movement sub-system (blockedBy, timerStartRoomId)
│   │   ├── combat.ts       — combat sub-system
│   │   ├── inventory.ts    — inventory sub-system
│   │   ├── search.ts       — search sub-system
│   │   ├── examine.ts      — examine sub-system
│   │   ├── interact.ts     — examine-target interaction sub-system
│   │   ├── use.ts          — item use sub-system (targetEffects)
│   │   ├── look.ts         — look sub-system
│   │   ├── dialogue.ts     — talk/bluff sub-system
│   │   ├── alarm.ts        — alarm escalation sub-system
│   │   ├── detection.ts    — guard detection sub-system
│   │   ├── discovery.ts    — downed-guard discovery sub-system
│   │   ├── reveals.ts      — flag-gated item reveal sub-system
│   │   ├── patrol.ts       — guardPosition pure function
│   │   ├── room.ts         — room/enemy state helpers
│   │   └── dice.ts         — d20 roll helper
│   ├── renderer/
│   │   ├── index.ts        — wires DOM to engine
│   │   ├── room.ts         — room description + addenda
│   │   ├── actions.ts      — available action buttons
│   │   ├── hud.ts          — health, alarm level, time
│   │   └── chargen.ts      — character creation screen
│   ├── types/
│   │   ├── state.ts        — GameState, Protagonist, TimeState, etc.
│   │   ├── data.ts         — GameData, RoomData, ItemData, ItemEffect, etc.
│   │   ├── actions.ts      — Action discriminated union
│   │   ├── mission.ts      — MissionManifest
│   │   └── engine.ts       — SubSystemResult, EngineResult
│   ├── data/
│   │   ├── loader.ts       — buildGameData, initGameState
│   │   ├── templates.json  — shared EnemyTemplates (all missions)
│   │   └── missions/
│   │       └── mission-01/
│   │           ├── manifest.json  — starting state, deadline, timerStartRoomId
│   │           ├── map.json       — RoomData (14 rooms)
│   │           ├── items.json     — ItemData (10 items)
│   │           ├── enemies.json   — EnemyData (7 enemies)
│   │           └── design.md      — mission design document
│   ├── save/
│   │   ├── save.ts         — export GameState as download
│   │   └── load.ts         — import JSON → GameState
│   ├── constants.ts        — ACTION_COSTS, FALLBACK_ROOM, SKILLS
│   └── main.ts             — entry point
├── tests/
│   └── engine/             — 15 test files, one per sub-system
├── public/
│   └── index.html
├── CLAUDE.md
├── README.md
├── architecture.md
├── mission-template.md
├── package.json
├── tsconfig.json
└── vite.config.ts
```

Mission data lives in `src/data/missions/` under a per-mission subdirectory and is imported as JSON modules via Vite. No fetching needed. Only the engine gets unit tests — renderer does not.

## Game Data

All rooms, items, enemies, and dialogue are defined in JSON — not hardcoded in TypeScript. The engine reads data; it does not contain story content.

## Conventions

- **Prettier** — code formatting, zero-config
- **ESLint** with `@typescript-eslint` plugin — linting
- **TypeScript strict mode** — `"strict": true` in tsconfig
- **Vitest** — unit testing (natural fit with Vite)
- **Feature branches + PRs** — all changes go on a branch and are merged via pull request; never commit directly to main

## Testing

Test the engine, not the UI. Pure logic (D20 rolls, combat resolution, state transitions, room graph traversal) should have unit tests. DOM/rendering layer does not.

## What We Skip

- Husky / lint-staged — too much friction for a solo hobby project
- CI/CD — not needed until deployment

## Tone

Cold War thriller — understated, dry, period-authentic. Think early le Carré more than Moore-era Bond. British intelligence handler in a Whitehall office with no sign on the door; Soviet outpost guards with names and letters home; mission briefings that end before you ask questions. Occasional dark humour, never camp.

## Models and Engine

Full data models (Protagonist, Room, Item, Enemy, GameState, GameData) and engine architecture (processAction pipeline, sub-systems, Action union) are documented in @architecture.md

## Mission Design

Use @mission-template.md when designing a new mission. Work top-down: goal → five-act structure → area plans → room detail.

## Key Invariants

- An enemy with no `EnemyState` entry is considered **active** (default state). Only skip enemies that explicitly have `status !== 'active'` in state. Check `enemyState && enemyState.status !== 'active'`, never `!enemyState || enemyState.status !== 'active'`.
- `TimeState.timerActive` is optional. **Absent or `true` means the timer is running**; only an explicit `false` pauses it. Check `state.time.timerActive === false` to detect a paused timer, never `!state.time.timerActive`.
- Only `consumable`-type items are spent (marked `used: true`) on `use`. Gadgets, weapons, keycards, and documents are all reusable.
- `ItemData.targetEffects` overrides the main `effect` for a specific target ID and **never consumes the item**, regardless of item type.
- `Exit.blockedBy` names an enemy that physically prevents passage while active. The check is `!enemyState || enemyState.status === 'active'` — no EnemyState entry means active.

## Status

Engine complete. Renderer substantially complete. Mission 01 data complete (14 rooms, 7 enemies, 10 items). Planned: second mission, skill progression.
