# Jacob Kesher

A browser-based text adventure in the tradition of Zork — but set in the world of Cold War espionage. You play Jacob Kesher, a field agent infiltrating the lair of a megalomaniac villain. Sneak, fight, bluff, and gadget your way to the objective.

## Concept

- Classic room-based exploration with choice-driven interaction
- Stealth-first gameplay — combat is possible but noisy and risky; firearms are not unlimited (this is a spy thriller, not Rambo)
- D20-style skill checks for combat, sneaking, hacking, and persuasion
- Mission objectives, inventory, and guard state tracked throughout
- Spy thriller aesthetic — henchmen, laser grids, villain monologues

## Tech Stack

- **TypeScript** — game engine and logic
- **Vite** — build tool and dev server
- **Vanilla DOM** — no framework, terminal-style UI
- **JSON** — all game data (rooms, items, enemies, dialogue)
- **File download/upload** — save and load game state as a `.json` file
- **Vitest** — unit tests for the engine

## Development

```bash
npm install        # install dependencies
npm run dev        # start dev server (http://localhost:5173)
npm run build      # production build → dist/
npm run test       # run engine unit tests
npm run lint       # ESLint
npm run schema     # regenerate JSON schemas from TypeScript types
```

## Architecture

The engine is a pure function — `processAction(action, state, data)` returns a new `GameState` plus narrative messages. No DOM, no side effects, fully unit-testable.

All game content (rooms, items, enemies) lives in JSON files under `src/data/missions/`. The engine reads data; it contains no story content.

See [`architecture.md`](architecture.md) for full type definitions and engine pipeline documentation.

## Save System

Export your mission dossier at any time as a `.json` file. Load it back in to continue from where you left off. No server, no accounts, no cloud.

## JSON Schemas

TypeScript types are the source of truth for the data format. Run `npm run schema` to regenerate schemas in `schemas/`. VS Code picks them up automatically for inline validation of mission JSON files.

## Status

- **Engine** — complete (movement, combat, inventory, search, alarm, stealth takedowns, guard discovery, flag-gated reveals)
- **Mission 01: The Cipher Machine** — game data complete (10 rooms, 4 enemies, 7 items)
- **Renderer** — in progress
- **Deployed** — https://hobsojam.github.io/jacob-kesher/ (auto-deploys on push to `main`)
