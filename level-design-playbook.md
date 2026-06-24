# Jacob Kesher — Level Design Playbook

This document defines the vocabulary for generating credible missions. Read it before designing a skeleton, then apply its patterns when filling in room detail.

The playbook operates at two levels: **patterns** (named, reusable design building blocks) and **constraints** (per-phase minimums that keep missions coherent). A generation task proceeds: goal → seven-phase skeleton → area plans using patterns below → room JSON.

The seven phases are: **Briefing → Approach → Infiltration → Exploration → Climax → Escape Leg → End Scene**. Acts 0 and 6 (Briefing and End Scene) are timer-paused bookends; Acts 1–5 are the field mission.

---

## Phase Vocabulary

Each act has a distinct feel. If two adjacent acts feel the same, merge them or redesign the transition.

### Act 0 — Briefing

**Feel:** Calm before. The player is not yet Jacob-in-the-field; they are Jacob being told what to do and given the tools to do it. No threat, no timer, no urgency — the tension is entirely implied. The office is the same office every time. The handler doesn't wish you luck.

**Tone cues:** London. Grey. A first-floor room with no sign on the door. Files on a desk that has seen thirty years of crises. The handler sets down a pen when you enter and picks it up when you leave. Whatever you're about to do is already decided.

**Engine mechanics:** `startingRoomId` is the briefing room. `timerStartRoomId` is the first field room (e.g. `mountain_road`). Timer is paused (`timerActive: false`) until the player moves to `timerStartRoomId`. No action costs accrue. The player can examine freely.

**Minimum requirements:**
- 1 room
- 0 enemies
- Examine targets: the handler (examine → mission parameters in dialogue form), the mission folder/map, any starting gear visible on the desk
- 1 interact on the handler or mission documents that sets a `[handler]_briefed` flag
- 1 exit gated on `[handler]_briefed`: "Depart for the field" → Act 1 start room
- Starting gear issued here — items appear in `itemIds`, player takes them before departing

**Design rules:**
- The handler has a consistent name across missions (Alderton in M01). Use the same name and room unless the story explicitly changes the posting.
- Examine targets should tell the player what they need to know without spelling out the mechanics. "The cipher officer returns at nine" tells the player about the deadline; a turn counter does not.
- Do not put any puzzle or challenge in the briefing room. It is exposition, not gameplay.
- One exit only. There is no second option.
- The room's addenda should be empty at game start — nothing changes here while Jacob is away.

**Exit into Act 1:** Departing for the field activates the timer. Everything that happens next costs turns.

---

### Act 1 — Approach

**Feel:** Quiet. Orientating. The player is learning the engine while the fiction establishes place and threat. One guard maximum. No locked doors. No items strictly required.

**Tone cues:** Exterior. Cold. The enemy installation seen from the outside — imposing but not yet personal. The guard here has a name and probably a habit.

**Minimum requirements:**
- 1–3 rooms
- 1 named enemy (patrol preferred over stationed)
- 1 environmental detail that signals time pressure (a window lit, a dinner that will end)

**Optional elements:**
- 1 search reward — not required, but establishes search as a verb early; can provide an item that makes the Act 2 chokepoint easier
- 1 branch (approach route vs. waiting for guard to pass)

**Exit into Act 2:** One chokepoint — the fence, a gate, a wall — that requires either neutralising the guard or a found item. Not both simultaneously.

---

### Act 2 — Infiltration

**Feel:** First real decision. The player commits to an approach and lives with it. Two viable routes minimum — one riskier, one slower.

**Tone cues:** The threshold between outside and inside. A loading bay, a service entrance, a basement. Functional, unglamorous. The enemy here is doing a job, not guarding a treasure.

**Minimum requirements:**
- 2–4 rooms
- 1 patrol guard (creates timing pressure)
- 1 lock-and-key (key on an enemy or hidden, door into the building)
- 1 environment bypass (route that avoids the key entirely, at higher time or risk cost)
- 1 branch (the bypass vs. the key route)

**Exit into Act 3:** Both routes in Act 2 must converge at a single entry point to the hub. The player arrives at Act 3 with different items and information depending on how they came through.

---

### Act 3 — Exploration

**Feel:** The longest act. Multiple rooms, multiple threats, multiple things to find. The player must gather 1–2 items before they can enter Act 4. Side rooms are optional but reward curiosity or punish it.

**Tone cues:** The interior of the facility — offices, corridors, utility rooms. People who work here, routines that don't accommodate intruders. Guards are people, not obstacles: they have names on rosters, jackets on hooks, letters on desks.

**Minimum requirements:**
- 3–6 rooms
- 1 hub room (corridor, lobby) that connects the spokes
- 2+ enemies (mix of stationary and patrol)
- 1 chokepoint guard (stationed, blocks a key exit — must be bypassed, neutralised, or bluffed)
- 1 multi-route unlock (2–3 ways to get the key item or bypass the lock)
- 1 safe room (no enemies — a break in tension, often a search reward)

**Optional elements:**
- 1 high-risk side room (enemy present, rewarding to visit but not required for the critical path)

**Exit into Act 4:** A locked door requiring the key item found in this act. The player earns Act 4 by solving Act 3.

---

### Act 4 — Climax

**Feel:** Pure time pressure. The player does the thing they came for. Short. Quiet. The tension is the turn counter.

**Tone cues:** The object itself — a machine, a safe, a person. Technical and specific. Whatever Jacob photographs or extracts should feel real enough to care about losing.

**Minimum requirements:**
- 1–2 rooms
- 1 objective action (interact or use-on) that sets the mission_complete precondition flag
- 1 examine target that tells the player something about what they're looking at
- 0 required items beyond what unlocks the door (found in Act 3)

**Design rules:**
- Primary tension should be the timer, not combat. Enemies are not prohibited but should be exceptional — a villain in the room, a dog on a short patrol. If an enemy is present, there must be a non-combat way past them.

**Exit into Act 5:** Same door as entry — Act 4 is always a dead end. The exit back is the beginning of the escape.

---

### Act 5 — Escape Leg

**Feel:** The world has shifted. At least one route is closed; something the player found or avoided during infiltration now matters. They must solve a routing problem they didn't know they'd face.

**Tone cues:** Doors that were open are now guarded. Guards who were elsewhere are now here. The building feels hostile in a different way — not quiet danger but active pursuit.

**Minimum requirements:**
- 1 route closure (alarm or repositioned guard makes the straightforward exit impossible)
- 1 surviving escape route
- 0 new locks (the player has no time to find new items)
- World state changes driven by flags already set during play

**Design principles:**

1. **Reuse is an option, not a rule.** The escape can retrace entry rooms, or it can open new territory — a runway, a route inaccessible on the way in, a room that was locked from the other side. What matters is that the player can navigate it without preparation they haven't already done.

2. **Close one route, leave one open.** The alarm closes the easy route; the bypass remains. The player is forced to use something they may have found but not needed.

3. **Transform, don't populate.** Prefer repositioning existing guards via `alarmRoomId` over adding new ones. New guards at the extraction point or a previously empty location are valid when the mission demands it; new guards reappearing in rooms the player has already cleared feel arbitrary.

4. **Let the player's choices echo.** A guard they neutralised is still down. A route they found is still open. The escape rewards systematic play.

5. **The extraction point can be anywhere.** A car in the trees, an experimental jet on a runway, a contact in a safe house, a radio in a room Jacob has never visited. What matters is that it is reachable through the post-alarm map and requires the Act 4 precondition flag.

6. **Don't add new locks; do add new pressure.** New guards, a repositioned enemy at the extraction point, a route riskier than it looked going in — all valid. A new key the player doesn't have, a hidden item requiring search, a puzzle needing preparation — not valid. The constraint is on *preparation*, not on *threat*.

**Exit from Act 5:** Interact with the extraction point. Requires the mission precondition flag set in Act 4.

---

### Act 6 — End Scene

**Feel:** Resolution. The mission is over; Jacob's immediate world contracts to whatever follows extraction. The player is no longer in danger. The tone should match what the mission earned: a clean operation gets a quiet close, a messy one gets something more ambivalent.

**Form:** The end scene can take any form that fits the mission:
- A return to Whitehall — Alderton's dry accounting of what happened (the default for espionage missions; currently implemented as renderer text via `debriefLine()` in `renderer/index.ts`)
- A brief narrative coda — Jacob sails off for a well-earned rest; the threat neutralised, the file closed
- An in-game room the player can explore before the game ends, with flag-driven addenda reflecting their choices

**Minimum requirements:**
- Some form of resolution — the game must not end mid-action
- Flag-driven variation: the end scene should differ based on at least `alarm_raised` and mission outcome
- No new puzzles, locks, or items

**Design rules:**
- The end scene reflects what actually happened, not what the mission hoped would happen. A botched operation that scrapes through gets an acknowledgement of the mess.
- Keep it brief. The player knows the mission is over.
- If using the Whitehall room: same description as the briefing room — same office, different time of day, different thing on the desk.
- If seeding the next mission (a name dropped, a folder on the desk), put it in an examine target the player can skip. Never mandatory.

---

## Challenge Patterns

Named building blocks. Each mission should use 3–5 patterns across the field acts.

---

### PATROL WINDOW

**What it creates:** Timing pressure. The player must observe a guard's route and move through a room during the gap.

**How it works:** A patrol guard with a `PatrolRoute` covers two or more rooms on a cycle. The player can see the guard in the room, wait for their circuit to carry them away, then move. Search during a window is high-risk — the guard may return.

**Data required:**
- `EnemyData.patrol.roomIds[]` and `cycleTime`
- `PatrolRoute.startOffset` to stagger multiple guards

**Design rules:**
- Cycle time of 4–8 turns is readable without being punishing
- At least one room in the patrol route should be visible to the player before they commit to moving
- A patrol that covers 3+ rooms becomes unpredictable; keep them on 2-room cycles unless the mission is deliberately hard
- Pair with a SEARCH REWARD in the room being patrolled — makes the risk worth taking

**M01 example:** Volkov (service_yard → loading_bay, cycle 6). The keycard is on him, so the player must either shadow him closely or wait for a window.

---

### LOCK-AND-KEY (SINGLE DOOR)

**What it creates:** A clear gate. There is one entrance to the destination room, and it requires an item or skill. The player cannot route around it via a second door.

**How it works:** An exit has `requires.itemId` or `requires.skillId`. The destination room has no other entrance. There may be multiple ways to *acquire* the key — that is a separate question handled by MULTI-ROUTE UNLOCK — but there is no alternate path to the room itself.

**Data required:**
- `Exit.requires.itemId` or `requires.skillId`
- Item in a room's `itemIds` or `hiddenItemIds`, or in an enemy's `inventory`
- Confirm in the map that no other exit leads to the same `destinationId`

**Design rules:**
- Use sparingly — one or two per mission maximum. More than two and the game feels like a key hunt.
- The item's location should be discoverable through normal play (examine, search, loot), not random
- Never put the only key on a dead-end enemy with no escape route (trap state)
- Pair with MULTI-ROUTE UNLOCK to give players options for acquiring the key

**M01 example:** `cipher_room` has one entrance, requiring `cipher_room_key`. The key itself has three acquisition routes (see MULTI-ROUTE UNLOCK), but there is no alternate door into the cipher room.

---

### LOCK-AND-KEY (SKILL CHECK)

**What it creates:** Character differentiation. A high-skill player bypasses a gate that others must route around.

**How it works:** An exit or ExamineTarget interaction requires `skillId` + `skillLevel`. Players who invested in that skill get a shortcut; others take the longer path.

**Data required:**
- `Exit.requires.skillId` and `requires.skillLevel`
- OR `ExamineTarget.interactRequires.skillId` and `interactRequires.skillLevel`

**Design rules:**
- Always provide a non-skill alternative (item, route, or extra time cost). A skill check that has no bypass is a dead end for low-skill characters.
- The skill shortcut should save time, not be the only path
- Make the skill requirement visible (a note on the drawer, a guard mentioning it) so the player understands why they can't do it

**M01 example:** `duty_office_drawer` interact requires `safecracking ≥ 2` (noted as lock_picking in design, should be safecracking per constants). Alternative: `duty_office_key` in mess_hall.

---

### MULTI-ROUTE UNLOCK

**What it creates:** Player agency. Multiple routes to the same goal, each with a different risk/reward profile.

**How it works:** A lock has 2–3 independent ways to satisfy it. At least one is low-risk/slow, one is high-risk/fast, one may require a specific item or skill.

**Design rules:**
- Three routes is the sweet spot: find the key (low risk, requires search), skill-check bypass (medium risk, character-dependent), steal from enemy or high-risk search (high risk, fast)
- Routes should be discovered through play, not listed in a tutorial
- Each route should feel like a genuine choice, not an obvious correct answer

**M01 example:** Three routes to `cipher_room_key`: (1) `duty_office_key` from mess_hall search → use on drawer, (2) skill-check lock-pick on drawer, (3) `maintenance_key` from loading_bay search → `supply_cabinet` in comms_room reveals duplicate.

---

### CHOKEPOINT GUARD

**What it creates:** A hard gate that requires active engagement — the player cannot simply walk past.

**How it works:** An exit has `blockedBy: enemyId`. While that enemy is active, the exit is impassable. The player must neutralise, bluff, or find an alternate route.

**Data required:**
- `Exit.blockedBy` (enemy ID)
- The enemy must have `canBeBluffed` set if dialogue bypass is intended
- An alternate route must exist somewhere in the area

**Design rules:**
- One per act maximum. More than one and the map feels like a gauntlet.
- The alternate route should be genuinely different in feel (not just a one-room detour)
- If the enemy can be bluffed, the dialogue check should have a clear cost on failure (awareness escalates, alarm rises)
- Prefer stationed enemies for chokepoints; patrol guards as chokepoints are frustrating because their window is the only bypass

**M01 example:** Petrov blocks the duty_office exit. Only bypass: neutralise him or wait for a patrol gap he doesn't have (stationed, so must be dealt with).

---

### ENVIRONMENT BYPASS

**What it creates:** A stealthy alternative that avoids the main route entirely, at a cost (time, or finding the entry point).

**How it works:** A secondary exit (often hidden, often requiring search) gives access to a room reachable by the main route. The bypass typically has no enemy but costs more turns.

**Data required:**
- A second exit connecting two rooms, potentially with `hidden: true`
- The bypass room itself (ventilation shaft, drain, fire escape) — adds a room to the map

**Design rules:**
- The bypass route must be traversable without items — it can route around a locked door, a guard, or a patrol. The point is that the player doesn't need the blocked route's key to use it. The bypass itself must not have an item gate.
- Bypasses that are too obvious remove tension from the main route; make them findable through search or examine
- The bypass room should have character — it shouldn't just be a corridor. A ventilation shaft has sounds from below; a drain has smell and darkness

**M01 example:** Ventilation shaft connects service_yard and ground_floor_corridor, bypassing the loading_bay keycard lock and Volkov entirely.

---

### SEARCH REWARD

**What it creates:** Risk vs. reward decisions. Players who invest turns in searching get items that make later challenges easier.

**How it works:** A room has `hiddenItemIds` populated. The `search` action (4 turns + search difficulty modifier) reveals them. An enemy in the room during search means discovery risk.

**Data required:**
- `RoomData.hiddenItemIds[]`
- `RoomData.searchDifficulty` (modifies time cost and risk)
- `EnemyData` in the same room (optional but raises stakes)

**Design rules:**
- Search rewards should be useful but not required. A player who misses them should still have a path to the goal.
- Place search rewards in thematically appropriate rooms (a key left on a mess hall table, a tool in a loading bay)
- High searchDifficulty rooms should have higher-value rewards
- Don't put a search reward in a room with a patrol guard and a short cycle — the timing is too punishing

**M01 example:** `wire_cutters` in mountain_road ditch (search, no guard). `duty_office_key` in mess_hall (search difficulty 1, no guard). `cipher_room_key` duplicate in comms_room (search difficulty 4, Nikitin present).

---

### ALARM TRANSFORMATION

**What it creates:** Consequences. The world state changes permanently when the player makes noise or a guard is discovered. Previously safe routes become dangerous; previously dangerous routes close entirely.

**How it works:** Global flag `alarm_raised` (or an escalating tier) gates room addenda, exit availability, and enemy awareness overrides. Guards reposition via `alarmRoomId` in EnemyData.

**Data required:**
- `RoomData.addenda` entries keyed to alarm flags
- `Exit.blockedBy` referencing a guard repositioned to that exit via `alarmRoomId` — the correct way to close a route on alarm. Note: `Exit.requires.flag` checks only that a flag IS set; it cannot check for a flag being absent, so it cannot be used to close an exit when `alarm_raised`.
- `EnemyData.alarmRoomId` — where a guard moves when `alarm_raised` is set

**Design rules:**
- Pre-design the alarm state alongside the normal state. Every room should have an addendum for `alarm_raised` if guards reposition there.
- Close the easy route, not the only route. An alarm that makes escape impossible is a game-ending trap.
- The bypass established in Act 2 should always survive the alarm state — that's its purpose.
- Guard repositioning should be narratively motivated (Volkov goes to guard the loading bay — of course he does)

**M01 example:** `alarm_raised` → Volkov repositions to loading_bay (blocking it), Petrov patrols full corridor, Morozov goes alert at fence. Ventilation shaft remains open.

---

### SOCIAL BYPASS

**What it creates:** Character differentiation via dialogue. A player with high charisma can talk past a guard that others must physically deal with.

**How it works:** `EnemyData.templateId` references a template with `canBeBluffed: true`. The `talk` action triggers a bluff attempt. Success removes or pacifies the guard; failure escalates awareness.

**Data required:**
- `EnemyTemplate.canBeBluffed: true`
- `EnemyTemplate.canBeDisguised: true` (if disguise is available)
- `dialogue.ts` sub-system handles the check

**Design rules:**
- A bluff success should cost something (time, risk of later discovery) even if it avoids immediate danger
- Only work on humans: `guard`, `henchman`, `civilian`, `contact` — never dogs
- Don't make social bypass the only route past a critical chokepoint. It's character-dependent; not all builds have charisma.
- Bluffing a guard who is already alert should have a low success chance

**M01 notes:** Social bypass not heavily used in M01. Best applied to a stationed guard who isn't the sole path forward.

---

## Branch Patterns

A branch is any point where the player has a genuine choice of route. Every mission should have at least two branches. Act 3, as the longest act, typically supports more — aim for two or three there, but don't force it if the room count is low.

### RISK BRANCH

Two routes to the same destination: one faster and noisier, one slower and quieter.

```
A → [fast/loud] → C
A → [slow/quiet] → B → C
```

The player chooses based on their alarm state, skill build, and time remaining. Neither is wrong.

**M01 example:** Loading bay (fast, requires keycard) vs. ventilation shaft (slow, always available). On escape with alarm raised, loading bay closes and shaft becomes the only option.

---

### MULTI-KEY BRANCH

Multiple ways to satisfy a single lock. Routes converge at the lock.

```
[route 1: search mess hall] → duty_office_key
[route 2: skill check]      → unlock drawer directly
[route 3: search comms]     → cipher_room_key duplicate
                                   → cipher_room
```

The player doesn't choose a branch consciously — they find whichever key their play style leads them to.

---

### INFORMATION BRANCH

The player can enter a side room that provides information (examine targets, lore) without being required to. Skipping it saves time; entering it gives context or a bonus.

```
A → [main route] → C
A → [side room] → B (no exit to C) → backtrack to A → C
```

Side rooms should contain something worth the detour — not just flavour, but an item, a piece of intelligence that explains a later puzzle, or a shortcut unlocked by what they find.

---

### WORLD-STATE BRANCH

The same map topology routes differently depending on global flags. A room that was safe is now guarded; a door that was locked is now open.

Not a branch the player chooses at design time — it's an emergent branch driven by their alarm state and decisions. Design it explicitly: what does this room look like when `alarm_raised`? When `machine_photographed`? When `fence_cut`?

---

## Enemy Placement Patterns

### STATIONED GUARD

Remains in one room indefinitely. Use for chokepoints. Dangerous to approach; safe to route around if an alternate path exists.

- Position at the end of a corridor, not the middle (gives player time to observe before committing)
- Give them an examine target that reveals their habits or attention direction
- If they can be bluffed, ensure a failed bluff has a meaningful but non-fatal consequence

### PATROL GUARD

Pure-function position; moves between 2–3 rooms on a fixed cycle. Use for timing pressure.

- Shorter cycles (4–6 turns) for high-tension areas; longer (8–12) for approach/low-stakes areas
- Stagger `startOffset` when two patrols share a space so they don't synchronise
- A patrol that carries a key item is a PATROL WINDOW challenge — the player must time a loot or intercept

### AMBIENT GUARD

In a side room; optional obstacle. Player can avoid them entirely by not entering.

- High-risk search rewards in their room make them worth engaging
- A bluffable ambient guard is low-stakes practice for the SOCIAL BYPASS pattern
- Give them environmental tells (radio static, footsteps) before the player commits to entering

### ALARM REPOSITIONER

A guard who is somewhere benign normally but moves to a critical location when `alarm_raised`. Blocks a route on escape that was clear on infiltration.

- Always pair with an alternate escape route that remains open
- The new position should make narrative sense (Volkov goes to loading bay because that's where his post is during lockdown)
- Document the repositioning in the enemy roster's `alarmRoomId` column

---

## Item Economy

### PER-MISSION BUDGET

| Category | Count | Notes |
|----------|-------|-------|
| Starting gear | 0–2 | Issued at briefing; not counted toward the world item total |
| Key items | 1–2 | Required to reach Act 4; every key item must have an alternate acquisition route |
| Optional route items | 1–3 | Open alternate paths or reduce difficulty; completable without them via a harder route |
| Search rewards | 1–3 | Hidden items; discoverable but not required |
| Enemy loot | 1–2 | Items on enemies worth acquiring; drives engagement with PATROL WINDOW and CHOKEPOINT GUARD |

Aim for 4–10 items discoverable in the world (key items + optional route items + search rewards + enemy loot, not counting starting gear). Fewer than 4 and the world feels sparse; more than 10 and inventory management crowds out decision-making.

### KEY ITEM RULES

- Every key item must have at least one findable alternative or bypass
- Never put the only key item in a room with no safe entry (locked → dead end)
- A key item carried by an enemy should be gettable three ways: loot the enemy, find the alternate item elsewhere, use a skill bypass
- Keycards gate exits via `Exit.requires.itemId` — document which exit each keycard unlocks in the flags reference table

### SEARCH REWARD RULES

- Reward difficulty should match the search difficulty: easy room → minor reward, hard room → significant reward
- Search rewards found in Act 2 should be usable in Act 3 or 4 (don't make them immediately useful — delay the payoff)
- Never place a search reward that is both required and in a high-risk room without a fallback

---

## Flag and World-State Patterns

Flags are the mechanism for world-state change. Use them consistently.

### NAMING CONVENTION

```
[noun]_[past_participle]   → fence_cut, drawer_unlocked, alarm_raised
[noun]_[state]             → mission_complete, mission_failed
```

Avoid abbreviations. Flag names are read by the renderer and appear in addenda — they should be self-documenting.

### FLAG CATEGORIES

| Type | Example | Purpose |
|------|---------|---------|
| Room flag | `fence_cut` | Local state change; affects exits and addenda in one room |
| Global flag | `alarm_raised` | World-state change; affects multiple rooms and guards |
| Precondition flag | `machine_photographed` | Gates the win condition; set at climax |
| Terminal flag | `mission_complete`, `mission_failed` | Ends the game |

### ADDENDUM DISCIPLINE

Every room should have addenda for:
1. The alarm state (if guards reposition there or the room changes feel)
2. Any local flag change that visibly affects the room (fence_cut, drawer_unlocked)
3. The precondition flag at the extraction point (signals that escape is ready)

Addenda should change what the player sees, not just repeat what they did. "The fence has a gap" not "You cut the fence."

---

## Anti-Patterns

Patterns to avoid. If you find one in a skeleton, redesign.

| Anti-pattern | Problem | Fix |
|--------------|---------|-----|
| **Dead end key** | Only key item is in a room with no safe entry path | Add an alternate item or a bypass |
| **Sequential locks** | Must find A to open B to find C to open D | Max 2 gates in sequence; provide shortcuts |
| **Patrol synchronisation** | Two patrol guards cover the same rooms on the same cycle | Stagger `startOffset` so windows open independently |
| **Empty corridor** | A room exists only as a connector, with no examine targets or history | Give it at least one examine target with a piece of the world |
| **Search-or-fail** | A required item is hidden and must be searched for with no alternative | Required items must be visible, or have a non-search alternative |
| **Alarm as game-over** | `alarm_raised` closes all escape routes | Always leave one route open through the alarm state |
| **Orphaned room** | A room has no narrative reason to exist | Cut it or give it a side-challenge (SEARCH REWARD or AMBIENT GUARD) |
| **Uniform threat** | Every room has the same type of enemy (all stationed, all patrolling) | Mix enemy placement patterns across the map |

---

## Generation Checklist

Before writing JSON for any mission, verify the skeleton satisfies these:

**Structure**
- [ ] Seven phases with distinct feel (Briefing, Approach, Infiltration, Exploration, Climax, Escape Leg, End Scene)
- [ ] Briefing room uses `timerStartRoomId` to pause timer; handler name and room consistent with prior missions
- [ ] Room counts within phase budgets (Approach 1–3, Infiltration 2–4, Exploration 3–6, Climax 1–2)
- [ ] Acts 2 and 3 each have at least one branch
- [ ] Escape leg: at least one route closure, at least one surviving route
- [ ] Extraction point is narratively motivated; Act 4 precondition flag required to use it
- [ ] End scene planned; flag-driven variation for at least `alarm_raised` and mission outcome

**Challenges**
- [ ] At least one PATROL WINDOW or CHOKEPOINT GUARD per field act (except Briefing, Climax, and End Scene)
- [ ] At least one MULTI-ROUTE UNLOCK in Act 3
- [ ] At least one SEARCH REWARD in Acts 1 and 3
- [ ] At least one ALARM TRANSFORMATION affecting the escape

**Enemies**
- [ ] At least one patrol and one stationed guard
- [ ] All alarm repositioning documented in enemy roster
- [ ] No patrol synchronisation (check `startOffset`)

**Items**
- [ ] 4–10 items total
- [ ] Every key item has an alternate route or bypass
- [ ] Starting gear documented in protagonist state

**Flags**
- [ ] All flags listed in flags reference table with setter and checker
- [ ] Every room has an `alarm_raised` addendum if relevant
- [ ] Win condition flag traced from climax action → extraction interact → `mission_complete`
