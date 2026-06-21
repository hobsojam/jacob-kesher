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
│   │   ├── movement.ts     — movement sub-system
│   │   ├── combat.ts       — combat sub-system
│   │   ├── inventory.ts    — inventory sub-system
│   │   ├── search.ts       — search sub-system
│   │   ├── alarm.ts        — alarm sub-system
│   │   └── patrol.ts       — guardPosition pure function
│   ├── renderer/
│   │   ├── index.ts        — wires DOM to engine
│   │   ├── room.ts         — room description + addenda
│   │   ├── actions.ts      — available action buttons
│   │   └── hud.ts          — health, alarm level, time
│   ├── types/
│   │   ├── state.ts        — GameState, Protagonist, etc.
│   │   ├── data.ts         — GameData, RoomData, ItemData, etc.
│   │   └── actions.ts      — Action discriminated union
│   ├── data/
│   │   ├── map.json        — all RoomData (~500 rooms per MB, 50-room lair ≈ 85KB)
│   │   ├── items.json      — all ItemData
│   │   ├── enemies.json    — EnemyData instances
│   │   └── templates.json  — EnemyTemplates
│   ├── save/
│   │   ├── save.ts         — export GameState as download
│   │   └── load.ts         — import JSON → GameState
│   ├── constants.ts        — ACTION_COSTS, FALLBACK_ROOM
│   └── main.ts             — entry point
├── tests/
│   └── engine/
│       ├── combat.test.ts
│       ├── movement.test.ts
│       ├── inventory.test.ts
│       └── search.test.ts
├── public/
│   └── index.html
├── CLAUDE.md
├── README.md
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .eslintrc.json
```

Data will live in `src/data/` (planned — not yet created) and will be imported as JSON modules via Vite. No fetching needed. Only the engine gets unit tests — renderer does not.

## Game Data

All rooms, items, enemies, and dialogue are defined in JSON — not hardcoded in TypeScript. The engine reads data; it does not contain story content.

## Conventions

- **Prettier** — code formatting, zero-config
- **ESLint** with `@typescript-eslint` plugin — linting
- **TypeScript strict mode** — `"strict": true` in tsconfig
- **Vitest** — unit testing (natural fit with Vite)
- **Git on main** — solo project, no feature branches unless needed

## Testing

Test the engine, not the UI. Pure logic (D20 rolls, combat resolution, state transitions, room graph traversal) should have unit tests. DOM/rendering layer does not.

## What We Skip

- Husky / lint-staged — too much friction for a solo hobby project
- CI/CD — not needed until deployment

## Tone

_To be decided — somewhere between campy Bond and grittier Cold War thriller._

## Models and Engine

Full data models (Protagonist, Room, Item, Enemy, GameState, GameData) and engine architecture (processAction pipeline, sub-systems, Action union) are documented in @architecture.md

## Key Invariants

- An enemy with no `EnemyState` entry is considered **active** (default state). Only skip enemies that explicitly have `status !== 'active'` in state. Check `enemyState && enemyState.status !== 'active'`, never `!enemyState || enemyState.status !== 'active'`.

## Status

Planning phase. No code written yet.
