# Jacob Kesher — Architecture

## Protagonist Model

```typescript
type SkillId =
  | 'pugilism' | 'marksmanship' | 'evasion' | 'safecracking'
  | 'covert' | 'signals' | 'disguise' | 'acrobatics'

interface Skill {
  id: SkillId      // one of the fixed skill IDs above
  label: string    // human-readable, e.g. "Pugilism"
  level: number    // unclamped — negative values valid
}

interface Inventory {
  weapons: [string | null, string | null]                // holster + held
  gadgets: [string | null, string | null]                // two pockets
  small:   [string | null, string | null, string | null] // keycard/document/consumable
  special: string | null                                 // motorbike, MacGuffin, etc.
}

interface Protagonist {
  currentRoom: string
  previousRoomId: string | null
  health: number
  maxHealth: number
  stats: {
    strength: number      // melee combat, breaking things
    agility: number       // stealth, dodging
    intelligence: number  // base for hacking, persuasion
    charisma: number      // disguise, bluffing, interrogation
  }
  skills: Skill[]
  inventory: Inventory
  flags: Record<string, boolean>
}
```

Inventory slot constraints:
- `weapons` → `weapon_melee` or `weapon_ranged` only
- `gadgets` → `gadget` only
- `small` → `keycard`, `document`, `consumable` only
- `special` → anything that doesn't fit elsewhere

Picking up an item when its category slots are full forces a drop/swap decision.

## Room Model

Exits are labeled, not cardinal. "Take the service elevator", "crawl through the ventilation shaft". Cardinal directions only if the geography genuinely calls for it.

Room descriptions use a base + addenda pattern to avoid combinatorial explosion. Each addendum is independent and appended when its flag is true.

```typescript
interface Exit {
  destinationId: string
  label: string              // free-form, e.g. "take the service elevator"
  requires?: {
    itemId?: string          // e.g. keycard
    skillId?: string         // e.g. "safecracking"
    skillLevel?: number
    flag?: string            // e.g. "power_restored"
  }
  hidden?: boolean           // only revealed on search
  blockedBy?: string         // enemy ID; impassable while that enemy is active
}

interface Addendum {
  flag: string               // room flag that triggers this line, e.g. "lights_on"
  text: string               // appended to base description when flag is true
}

interface ExamineTarget {
  id: string
  label: string              // e.g. "the filing cabinet"
  description: string
  interactLabel?: string     // button label for optional interaction
  effect?: ItemEffect[]      // effects applied when interaction fires
  interactRequires?: {       // requirement before interact can fire
    itemId?: string
    skillId?: string
    skillLevel?: number
  }
}

interface FlagReveal {
  flag: string               // room flag that triggers the reveal
  itemId: string             // item promoted from hiddenItemIds to visible itemIds
}

interface RoomData {
  id: string
  label: string
  description: string        // always shown
  addenda: Addendum[]        // conditionally appended based on room flags
  exits: Exit[]
  itemIds: string[]          // visible items at game start
  hiddenItemIds: string[]    // only revealed on search
  examineTargets: ExamineTarget[]
  searchDifficulty?: number  // modifies search action cost and risk
  reveals?: FlagReveal[]     // items promoted to visible when their flag is set
}

// Mutable — lives in GameState, persisted in save file
interface RoomState {
  id: string
  itemIds: string[]          // changes as items are taken
  enemyIds: string[]         // changes as guards are dealt with
  flags: Record<string, boolean>
  visited: boolean
}
```

## Map

The map is a directed graph — rooms are nodes, exits are edges. No separate map structure needed; rooms define the topology.

```json
{
  "rooms": []
}
```

At startup the engine indexes rooms for fast lookup:

```typescript
const roomIndex: Record<string, RoomData> = {}
map.rooms.forEach(r => roomIndex[r.id] = r)
```

- **Exits are one-way by default** — two-way connections require exits defined in both rooms
- **One-way exits** are valid and useful — drops, doors that only open from one side, one-time passages
- **No coordinates** — rooms have no x/y position, only connections

## Fallback Room

If a room lookup fails, the engine routes to a hardcoded fallback room — not in JSON data. The engine always tracks `previousRoomId` on the protagonist so the fallback room can inject a "go back" exit dynamically.

```typescript
const FALLBACK_ROOM: RoomData = {
  id: "__fallback__",
  label: "Darkness",
  description: "It is pitch black. You are likely to be eaten by a grue.",
  addenda: [],
  exits: [],           // engine injects a dynamic "go back" exit to previousRoomId
  itemIds: [],
  hiddenItemIds: [],
  examineTargets: [],
}
```

## Time Model

One unified turn counter drives both guard patrols and the mission countdown. No separate clocks.

```typescript
interface TimeState {
  elapsed: number            // turns since mission start
  missionDeadline: number    // mission fails when elapsed >= this
  timerActive?: boolean      // absent/true = running; false = paused (e.g. in briefing room)
}
```

**Action costs:**
```typescript
const ACTION_COSTS = {
  move: 1,
  examine: 1,
  takeItem: 1,
  useGadget: 1,
  combat: 2,
  search: 4,       // modified up/down by room searchDifficulty
}
```

**Guard patrols are pure functions** — position is calculated from elapsed turns, not tracked in state. Guards do not need to be saved.

```typescript
interface PatrolRoute {
  roomIds: string[]      // ordered route
  cycleTime: number      // turns for full circuit
  startOffset?: number   // stagger guards so they don't all move together
}

function guardPosition(patrol: PatrolRoute, elapsed: number): string {
  const turnsPerRoom = patrol.cycleTime / patrol.roomIds.length
  const index = Math.floor((elapsed % patrol.cycleTime) / turnsPerRoom)
  return patrol.roomIds[index]
}
```

Search risk is calculable before the player commits: "will this guard's patrol bring them here during the next N turns?"

## Item Model

```typescript
type ItemType = 'gadget' | 'weapon_melee' | 'weapon_ranged' | 'keycard' | 'document' | 'consumable'

type ItemEffect =
  | { type: 'heal'; amount: number }
  | { type: 'set_room_flag'; flag: string }
  | { type: 'set_global_flag'; flag: string }
  | { type: 'set_global_flag_if'; condition: string; andItem?: string; flag: string; else_flag: string }
  | { type: 'message'; text: string }

interface ItemData {
  id: string
  label: string
  description: string
  type: ItemType
  damage?: number                              // HP per hit; defaults to 1
  effect?: ItemEffect                          // fired on `use`
  usableOn?: string[]                          // ExamineTarget IDs this item can target in the same room
  targetEffects?: Record<string, ItemEffect[]> // per-target override; never consumes the item
}

// Mutable — lives in GameState as a global Record, not per-location
interface ItemState {
  id: string
  used: boolean      // expended/read/fired
  broken: boolean    // damaged, non-functional, potentially fixable
}
```

`ItemState` is global because items can be in a room, in Jacob's inventory, or in an enemy's inventory. The engine maintains `itemStates: Record<string, ItemState>` in `GameState`.

- Only `consumable`-type items are spent (`used: true`) on use. Gadgets, weapons, keycards, and documents are reusable.
- `targetEffects` takes priority over `effect` when the item is used on a matching target, and **never** consumes the item regardless of type.
- `weapon_melee` — uses strength stat, breaks but does not run out of ammo
- `weapon_ranged` — uses agility stat, `used: true` when out of ammo

## Enemy Model

```typescript
type EnemyType = 'guard' | 'henchman' | 'villain' | 'dog' | 'civilian' | 'contact'

// Shared stereotype — defined once, referenced by many instances
interface EnemyTemplate {
  id: string                      // e.g. "guard", "attack_dog"
  type: EnemyType
  stats: {
    strength: number
    agility: number
    health: number
  }
  detectionRadius: number         // rooms away they can spot Jacob
  canBeBluffed: boolean           // dogs: false, civilians: true
  canBeDisguised: boolean         // some see through disguises
  wakeAfterTurns?: number         // turns unconscious before waking
  discoveryRisk?: number          // 0–1 probability per turn a downed instance is found; default 0
}

// Individual instance in the world
interface EnemyData {
  id: string
  name: string                    // "Boris", "Guard #3", "Dr. Kaufman"
  known?: boolean                 // false (default): renderer shows generic role label; true: shows name
  description?: string            // shown in room description while enemy is active
  templateId: string
  roomId: string                  // starting room
  patrol?: PatrolRoute            // omit if stationed
  inventory: string[]             // item IDs carried (omit or empty for dogs)
  startUnconscious?: number       // if set, enemy starts unconscious until this absolute turn
}

// Per-guard awareness. Absent means 'unaware'.
type Awareness = 'unaware' | 'suspicious' | 'alert'

// Mutable — lives in GameState
interface EnemyState {
  id: string
  status: 'active' | 'unconscious' | 'dead'
  health?: number                 // current HP; undefined means full health from template
  unconsciousUntil?: number       // absolute turn number when they wake
  inventory: string[]             // items remaining after looting
  awareness?: Awareness           // undefined === 'unaware'
}
```

- Patrolling enemy positions are pure functions of elapsed turns — not stored in state
- `unconsciousUntil` is an absolute turn: `elapsed >= unconsciousUntil` triggers wake
- `startUnconscious` pre-populates `EnemyState` in the loader; the enemy is absent from the world at turn 0 and wakes normally when `unconsciousUntil` passes
- Dogs: `canBeBluffed: false`, `canBeDisguised: false`
- Killing a civilian sets a flag on Jacob with story/score consequences

## Combat System

**Stealth takedown** — unseen + melee range only, always succeeds, silent. Jacob chooses neutralise (knockout) or kill. No weapon required. Only way to neutralise (non-lethal) an enemy.

**Combat rounds** — one roll per round. Jacob acts first, then enemy if still standing. Repeat until enemy is down or Jacob flees. Jacob can always flee; enemy may chase (deferred).

**Roll formula:**
```
Attack: 1d20 + attacker stat + skill bonus
Defence: 10 + defender agility

Melee attack:   strength + hand_to_hand skill
Ranged attack:  agility + marksmanship skill
Defence (both): agility + evasion skill
```

Formula applies to both Jacob and enemies.

**Damage:** every successful hit = 1 health point lost, regardless of weapon or attacker. Guards have `health: 1` — one hit drops them. Henchmen and villain have higher health values.

**Noise levels:**
```typescript
type NoiseLevel = 'silent' | 'quiet' | 'loud' | 'alarming'
// stealth takedown → silent
// unarmed combat  → quiet
// melee weapon    → loud
// ranged weapon   → alarming
```

**Stat mapping:**
| Action | Stat |
|--------|------|
| Melee weapon | strength |
| Unarmed / stealth takedown | strength |
| Ranged weapon | agility |
| Defence (any) | agility |

`intelligence` and `charisma` do not affect combat directly but may allow dialogue-based resolution (deferred).

## Engine Architecture

The engine is a pure function — takes an action and current state, returns new state and narrative messages. No DOM, no side effects, fully testable.

```typescript
interface EngineResult {
  state:     GameState
  messages:  string[]
  gameOver?: 'dead' | 'timeout' | 'success' | 'failed'
}

function processAction(
  action: Action,
  state:  GameState,
  data:   GameData
): EngineResult
```

**Actions — discriminated union:**
```typescript
type Action =
  | { type: 'move';             exitLabel: string }
  | { type: 'take';             itemId: string }
  | { type: 'drop';             itemId: string }
  | { type: 'examine';          targetId: string }
  | { type: 'search' }
  | { type: 'use';              itemId: string; targetId?: string }
  | { type: 'attack';           enemyId: string }
  | { type: 'stealth_takedown'; enemyId: string; intent: 'neutralise' | 'kill' }
  | { type: 'flee' }
  | { type: 'loot';             enemyId: string; itemId: string }
  | { type: 'look' }
  | { type: 'interact';         targetId: string }  // fire an ExamineTarget's interactLabel effect
  | { type: 'talk';             enemyId: string }   // dialogue/bluff
```

**Every action runs through the same pipeline:**
1. Dispatch to the relevant sub-system (movement, combat, search, inventory, etc.)
2. Advance time by `ACTION_COSTS[action.type]` (or sub-system's `timeCost` override)
3. Skip steps 4–8 if `timerActive === false` (e.g. in a pre-mission briefing room)
4. Wake any enemies whose `unconsciousUntil <= elapsed`
5. Run guard ambush check (enemy in same room while undetected)
6. Run detection check (enemy patrol enters current room)
7. Check flag-gated item reveals (`checkReveals`)
8. Check downed-guard discovery (`checkDiscoveries`) — time-advancing actions only
9. Check mission deadline
10. Roll alarm escalation based on noise produced
11. Return new state + messages

**Sub-systems** (each a pure function, delegated to by `processAction`):
- `movement` — validates exit requirements, `blockedBy` gate, timer activation, fallback room
- `combat` — attack rolls, damage, stealth takedowns, flee
- `inventory` — take/drop/loot, slot constraints
- `search` — hidden items, variable time cost from `searchDifficulty`
- `examine` — describe an ExamineTarget
- `interact` — fire an ExamineTarget's optional `effect[]`
- `use` — apply item effects, `targetEffects` overrides, spendable check
- `look` — re-describe current room (zero time cost, pure renderer helper)
- `dialogue` — talk/bluff against enemy's `canBeBluffed`
- `alarm` — noise → probabilistic escalation
- `detection` — guard patrol arrival in current room
- `discovery` — downed-guard discovery probability per turn
- `reveals` — flag-gated item promotion from hidden to visible

The renderer only ever calls `processAction()` and displays the result. It never touches game logic.

## GameState

The save file. Everything mutable lives here.

```typescript
interface GameState {
  protagonist:  Protagonist
  time:         TimeState
  roomStates:   Record<string, RoomState>
  enemyStates:  Record<string, EnemyState>
  itemStates:   Record<string, ItemState>
  flags:        Record<string, boolean>  // global flags e.g. "helicopter_ready", "alarm_raised"
}
```

Alarm state is stored as flags rather than a separate enum field. Noisy actions roll against a probability table to set escalating flags. A silenced pistol has low probability; an explosion near certainty.

## GameData

Static data loaded from JSON at startup. Never saved.

```typescript
interface GameData {
  roomIndex:       Record<string, RoomData>
  itemData:        Record<string, ItemData>
  enemyTemplates:  Record<string, EnemyTemplate>
  enemyData:       Record<string, EnemyData>
  deadlineMessage: string             // shown when mission times out
  timerStartRoomId?: string           // timer is paused until the player enters this room
}
```

## MissionManifest

Lives in `manifest.json` at the root of each mission folder. Consumed by the loader to build `GameData` and the initial `GameState`. Never stored in the save file.

```typescript
interface MissionManifest {
  id: string
  title: string
  description: string
  startingRoomId: string
  timerStartRoomId?: string      // if set, timer starts paused and activates on first entry here
  missionDeadline: number        // turns before timeout
  deadlineMessage: string        // narrative message shown on timeout
  protagonist: {
    health: number
    stats: { strength: number; agility: number; intelligence: number; charisma: number }
    skills?: Skill[]
    inventory: Inventory
  }
}
```
