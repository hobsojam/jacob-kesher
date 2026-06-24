# Jacob Kesher — Level Design Playbook

This document defines the vocabulary for generating credible missions. Read it before designing a skeleton, then apply its patterns when filling in room detail.

The playbook operates at two levels: **patterns** (named, reusable design building blocks) and **constraints** (per-phase minimums that keep missions coherent). A generation task proceeds: goal → seven-phase skeleton → area plans using patterns below → room JSON.

The seven phases are: **Briefing → Approach → Infiltration → Exploration → Climax → Escape → Debrief**. Acts 0 and 6 (Briefing and Debrief) are timer-paused bookends in the Whitehall office; Acts 1–5 are the field mission.

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
- 1 search reward (optional but establishes search as a verb)
- 1 environmental detail that signals time pressure (a window lit, a dinner that will end)
- 0 branches required; 1 optional (approach route vs. waiting for guard to pass)

**Exit into Act 2:** One chokepoint — the fence, a gate, a wall — that requires either neutralising the guard or a found item. Not both simultaneously.

---

### Act 2 — Infiltration

**Feel:** First real decision. The player commits to an approach and lives with it. Two viable routes minimum — one riskier, one slower. At least one item that opens a route is gated behind an enemy.

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
- 1 high-risk side room (enemy present, optional but rewarding to visit)

**Exit into Act 4:** A locked door requiring the key item found in this act. The player earns Act 4 by solving Act 3.

---

### Act 4 — Climax

**Feel:** No enemies. Pure time pressure. The player does the thing they came for. Short. Quiet. The tension is the turn counter, not a guard.

**Tone cues:** The object itself — a machine, a safe, a person. Technical and specific. Whatever Jacob photographs or extracts should feel real enough to care about losing.

**Minimum requirements:**
- 1–2 rooms
- 0 enemies
- 1 objective action (interact or use-on) that sets the mission_complete precondition flag
- 1 examine target that tells the player something about what they're looking at
- 0 required items beyond what unlocks the door (found in Act 3)

**Exit into Act 5:** Same door as entry — Act 4 is always a dead end. The exit back is the beginning of the escape.

---

### Act 5 — Escape

**Feel:** Familiar rooms, different world state. Time pressure is now explicit. The player retraces steps but at least one prior route is closed by alarm or guard repositioning. They must solve a routing problem they didn't know they'd face.

**Tone cues:** The world has changed. Doors that were open are now guarded. Guards who were elsewhere are now here. The building feels hostile in a different way — not quiet danger but active pursuit.

**Minimum requirements:**
- Reuse Act 1–3 rooms (no new rooms unless one is strictly necessary)
- 1 route closure (alarm or repositioned guard makes the straightforward exit impossible)
- 1 surviving escape route (the bypass established in Act 2)
- 0 new locks (the player has no time to find new items)
- World state changes driven by the `alarm_raised` flag already set during play

**Exit from Act 5:** Interact with the extraction point. Requires the mission precondition flag set in Act 4. The extraction point can be anywhere that makes narrative sense — the starting room, a new location, a vehicle, a radio in a room the player has never seen. It is not required to be where Act 1 began.

---

### Act 6 — Debrief

**Feel:** The same office. The same desk. Jacob sits in the chair opposite Alderton, and Alderton reads from the report before him without looking up. Whatever happened in the field is now a bureaucratic fact. The handler's assessment is dry, precise, and final.

**Tone cues:** London again. The mission is over but its consequences are not. Alderton does not celebrate; he accounts. A clean extraction is noted without warmth. A raised alarm is noted without anger. A dead civilian is noted with a single sentence and a pause.

**Engine mechanics:** Currently implemented as renderer-level narrative text triggered at game-over (see `debriefLine()` in `renderer/index.ts`). A full in-game debrief room would require the extraction point to route to `debrief_room` rather than setting `mission_complete` immediately — extraction sets a `[mission]_extracted` flag, the debrief room reads flags and presents addenda, and a final exit ("Leave the office") sets `mission_complete`. This engine change is deferred; the renderer text is the current implementation.

**Minimum requirements (full in-game room, when implemented):**
- 1 room (same `briefing_room` or a new `debrief_room` — handler returns to the office)
- 0 enemies
- Addenda driven by mission outcome flags:
  - `alarm_raised` → handler notes the complication, matter-of-factly
  - `[civilian]_killed` → "There will be a note in your file."
  - Clean extraction → no comment; Alderton moves to the next item
  - Time remaining → tight finish gets a dry remark; comfortable margin gets nothing
- 1 exit: "Leave the office" → sets `mission_complete`
- No puzzles, no items, no new information about the current mission

**Design rules:**
- Addenda should reflect what the player did, not what the mission hoped they'd do. If no civilians were harmed and the alarm wasn't raised, Alderton says almost nothing — that is the correct outcome, not a special achievement.
- The handler's voice is consistent across missions. He does not emote. He moves from fact to fact. Reserve judgement for the spaces between.
- If the debrief seeds the next mission (a folder pushed across the desk, a name mentioned), it must be in an examine target, not mandatory read text. The player can leave without seeing it.
- The debrief room should feel identical to the briefing room — same description, same furniture — except for the time of day and what's on the desk.

**Exit from Act 6:** "Leave the office." Sets `mission_complete`. Game over.

---

## Challenge Patterns

Named building blocks. Each mission should use 3–5 patterns, with no two adjacent rooms using the same one.

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

### LOCK-AND-KEY (SINGLE ROUTE)

**What it creates:** A clear gate. The player knows they need item X for door Y and must find X.

**How it works:** An exit has `requires.itemId` or `requires.skillId`. There is exactly one way to satisfy it. The item is in a known or findable location.

**Data required:**
- `Exit.requires.itemId` or `requires.skillId`
- Item in a room's `itemIds` or `hiddenItemIds`, or in an enemy's `inventory`

**Design rules:**
- Use sparingly — one or two per mission maximum. More than two and the game feels like a key hunt.
- The item's location should be discoverable through normal play (examine, search, loot), not random
- Never put the only key on a dead-end enemy with no escape route (trap state)
- Pair with MULTI-ROUTE UNLOCK if the item is hard to acquire

**M01 example:** `cipher_room_key` required for `cipher_room` exit. Three ways to get it (see MULTI-ROUTE UNLOCK).

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
- The bypass should skip the chokepoint or patrol, not a locked door (locks require items; bypasses should be physical)
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
- `Exit` with `requires.flag` checking alarm state (e.g. only available when alarm NOT raised)
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

A branch is any point where the player has a genuine choice of route. Every mission should have at least two branches; Act 3 should have three.

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
| Starting gear | 0–2 | Issued at briefing; defines player capability |
| Key items (required) | 1–2 | Items that gate Act 4 access |
| Bypass items | 2–4 | Items that open alternate routes or lower risk |
| Search rewards | 2–4 | Hidden items; useful but not required |
| Enemy loot | 1–2 | Items worth taking from enemies; drives engagement with PATROL/CHOKEPOINT patterns |

More than 8–10 items total and the inventory becomes unwieldy. Fewer than 4 and the world feels sparse.

### KEY ITEM RULES

- Every key item must have at least one findable alternative or bypass
- Never put the only key item in a room with no safe entry (locked → dead end)
- A key item carried by an enemy should be gettable three ways: loot the enemy, find the alternate item elsewhere, use a skill bypass
- Keycards are single-use gates; document what they open in the `usableOn` field

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

## Escape Leg Design

The escape is not a separate act in terms of rooms — it reuses Act 1–3 rooms. Design the escape alongside the infiltration.

### PRINCIPLES

1. **Close one route, leave one open.** The alarm closes the easy route (loading bay); the bypass route (ventilation) remains. The player is forced to use something they may have found but not needed.

2. **Transform, don't populate.** Don't add new guards on escape — reposition existing ones via `alarmRoomId`. The world feels changed, not expanded.

3. **Let the player's choices echo.** A guard they neutralised is still down. A route they found is still there. The escape rewards systematic play.

4. **The extraction point can be anywhere.** It does not have to be where Act 1 started. A car in the trees is one option; so is an experimental jet on a runway, a contact in a safe house, or a radio in a room Jacob has never visited. What matters is that the extraction point is reachable through the post-alarm map and that it requires the Act 4 precondition flag.

5. **Don't add new locks; do add new pressure.** The escape can introduce guards, a repositioned enemy at the extraction point, or a route that's riskier than it looked going in. What it cannot introduce is a new key the player doesn't have, a hidden item requiring search, or a puzzle that needs preparation. The constraint is on *preparation*, not on *threat*.

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
- [ ] Seven phases with distinct feel (Briefing, Approach, Infiltration, Exploration, Climax, Escape, Debrief)
- [ ] Briefing room uses `timerStartRoomId` to pause timer; handler name and room consistent with prior missions
- [ ] Room counts within phase budgets (Approach 1–3, Infiltration 2–4, Exploration 3–6, Climax 1–2, Escape reuses entry)
- [ ] Acts 2 and 3 each have at least one branch
- [ ] Escape leg uses at least one Act 2 bypass route
- [ ] Extraction point is narratively motivated; precondition flag from Act 4 is required
- [ ] Debrief addenda planned for: `alarm_raised`, any civilian casualties, time-on-station remark

**Challenges**
- [ ] At least one PATROL WINDOW or CHOKEPOINT GUARD per act (except Climax)
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
