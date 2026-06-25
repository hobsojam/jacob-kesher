# Mission 02 — A Quiet Extraction

## 1. Goal

- **What Jacob is after** — Yuri Kuznetsov, First Secretary (Cultural Section) at the Soviet consulate in Vienna. He has agreed to come over. He cannot walk without assistance — a bad hip, the result of a road accident in Minsk three years ago.
- **Why it matters** — Kuznetsov has a list of GRU sleepers in Western Europe committed to memory. He has agreed to give them up. He needs to be outside the building before the duty officer rotation at 2300, after which all movements are logged and a Soviet escort is required.
- **Win condition** — `defector_secured` flag set in Kuznetsov's room → interact with extraction vehicle in `side_alley` → `mission_complete`
- **Deadline** — 60 turns. The night duty officer takes his post at 2300.

---

## 2. Five-Act Structure

| Phase | Act | Purpose | Alarm state | Notes |
|-------|-----|---------|-------------|-------|
| Briefing | 0 | Mission parameters; starting gear | Paused | Whitehall, Alderton |
| Approach | 1 | Establish setting; exterior patrol | Undetected | Baranov patrol; kitchen light signals entry window |
| Infiltration | 2 | Two entry routes: front desk vs. service yard | Undetected → Suspicious | RISK BRANCH; visitor log complication |
| Exploration | 3 | Gather stairwell key; optional wheelchair; reach upper floor | Suspicious | Hub-and-spoke; MULTI-ROUTE UNLOCK; CHOKEPOINT GUARD |
| Climax | 4 | Reach Kuznetsov; set defector_secured | Any | PATROL WINDOW (Volkov) |
| Escape Leg | 5 | Get Kuznetsov out; alarm makes front dangerous; other routes survive | Alert | WORLD-STATE BRANCH |
| End Scene | 6 | The car drives. The file closes. | — | Flag variations: alarm_raised, visitor_logged, time remaining |

---

## 3. Map Shape

**Loop with hub.** Two entry routes (front entrance, service yard/kitchen) converge at a ground floor corridor hub. The upper floor is reached via one locked stairwell. On escape, a service stairs exit — locked from below, accessible from above — opens a new path back through the service corridor to the basement, and out to the same alley Jacob arrived through. The extraction car is visible during the approach; the player understands the loop before they complete it.

```
[whitehall_office] ── Act 0
         │
         ▼
  [neustiftgasse] ── Act 1, Baranov patrol ──────────┐
         │                                            │
    [side_alley]                          [front_entrance]  ── Act 2 Route A
    (wire, car)                           (visitor_logged)
         │                                            │
         ▼                                            │
   [service_yard]                                     │
         │                                            │
      [kitchen]  ──────────────────────────────────┘
     (Zima patrol)
              \
               ▼
    [ground_floor_corridor] ── Act 3 hub
     /      /      │       \          \
[duty_ [staff_  [medical_ [service_  stairwell
 office] common_  room]   corridor]    door
(Petrov) room]  (Irina,      │        (key)
               wheelchair)  [basement_    │
                            storeroom]    ▼
                                │   [second_floor_landing] ── Act 4
                                │       (Volkov patrol)
                                │           │
                                │   [kuznetsov_room]
                                │       (cane, defector_secured)
                                │           │
                                │   service stairs (escape only,
                                │   requires mobility_aid)
                                │           │
                                └───────────┘
                                [side_alley] ◄── extraction point
```

---

## 4. Area Plans

### Briefing (Act 0)

```
Rooms: whitehall_office
Enemies: none
Key items: diplomatic_credentials (document) — issued here, not counted toward world total
Key flags: alderton_briefed
Exits in: game start
Exits out: "Depart for Vienna" → neustiftgasse (timer activates)
Chokepoint: none — exposition only
```

Alderton has a street plan of the consulate on his desk. He sets down his pen when Jacob enters and picks it up when Jacob leaves. The mission folder identifies Kuznetsov by description and room number. The handler does not mention the hip. Jacob will see it when the man stands. He does not wish Jacob luck.

---

### Approach (Act 1)

```
Rooms: neustiftgasse, side_alley
Enemies: Baranov (patrol, neustiftgasse ↔ side_alley, cycle 8)
Key items: wire (hidden, side_alley — search reward, no guard, difficulty 1)
Key flags: none set here
Exits in: whitehall_office (timer activates on arrival)
Exits out:
  neustiftgasse → front_entrance (Route A)
  side_alley → service_yard (Route B)
  side_alley → extraction vehicle (gated: defector_secured only — visible but inactive)
Chokepoint: Baranov's patrol — crossing neustiftgasse to the forecourt or alley requires timing his window
```

Environmental detail: the kitchen window on the ground floor is lit. An examine target on the window establishes that when the light goes off, the kitchen staff leave and the service yard will have only Zima for a watch. Baranov's patrol covers both neustiftgasse and the side_alley, so Jacob needs a window on both routes.

Optional search reward: wire in the side_alley, no guard. Useful for picking the kitchen inner door (Act 2) without needing the service_key or a safecracking skill.

---

### Infiltration (Act 2)

```
Rooms: front_entrance, service_yard, kitchen
Enemies: Zima (patrol, kitchen ↔ service_yard, cycle 6)
Key items: service_key (hidden, kitchen — search reward, PATROL WINDOW risk, difficulty 2)
Key flags: visitor_logged (global, set at front_entrance receptionist interact)
           inner_door_unlocked (room, set by wire/service_key use or safecracking interact on inner_door)
Exits in:
  Route A: neustiftgasse → front_entrance (requires diplomatic_credentials for receptionist interact)
  Route B: side_alley → service_yard → kitchen → inner_door
Exits out: both routes converge at ground_floor_corridor
Chokepoint:
  Route A: receptionist interact sets visitor_logged; no combat, but paper trail
  Route B: inner kitchen door (locked — wire, service_key, or safecracking ≥ 2)
```

**RISK BRANCH:** Front entrance is faster, no stealth required, but sets `visitor_logged` (paper trail; Baranov checks the book if alarm is raised). Service route is slower, requires dealing with Zima's patrol window and the inner lock, but leaves no record.

Inner door options:
1. Use `wire` from Act 1 search — no skill required, direct unlock
2. Find `service_key` hidden in kitchen while Zima is away (SEARCH REWARD + PATROL WINDOW)
3. `safecracking ≥ 2` interact on `inner_door` examine target — no item required

Route A (front entrance) avoids the inner door entirely. It is the structural fallback for players who cannot resolve Route B.

---

### Exploration (Act 3)

```
Rooms: ground_floor_corridor (hub), duty_office, staff_common_room, medical_room, service_corridor, basement_storeroom
Enemies:
  Petrov (stationed, ground_floor_corridor) — CHOKEPOINT GUARD, blocks duty_office exit
  Irina (ambient civilian, medical_room) — bluffable
Key items: stairwell_key (MULTI-ROUTE UNLOCK — see below)
Optional items: wheelchair (medical_room), staff_id (staff_common_room)
Key flags: stairwell_door_open (room, set by using any stairwell_key variant on stairwell_door)
           mobility_aid (global, set by using wheelchair or cane on kuznetsov)
Exits in: ground_floor_corridor (convergence from Act 2)
Exits out: stairwell → second_floor_landing (requires stairwell_door_open room flag)
Chokepoint: Petrov stationed in corridor — blocks duty_office exit while active
```

**MULTI-ROUTE UNLOCK — stairwell_key (3 routes):**
1. Search `staff_common_room` (difficulty 1, no guard) — hidden `stairwell_key` in a desk drawer
2. Safecracking ≥ 2 on `key_cabinet` in `ground_floor_corridor` (risky — Petrov present) — reveals `stairwell_key_b`
3. Neutralise or loot Petrov — he carries `stairwell_key_c` on his person

All three variants work on the `stairwell_door` examine target in `ground_floor_corridor`.

**Branches in Act 3:**
- MULTI-KEY BRANCH: three routes to a stairwell key, each with different risk profile
- INFORMATION BRANCH: medical_room optional — Irina present, wheelchair visible; worth visiting if planning service escape; skippable if planning front exit under no alarm

**Safe room:** `staff_common_room` — no enemies, search reward, break in tension. A roster on the wall shows the building occupancy. A coffee cup still warm.

**Optional side exploration:** `service_corridor` → `basement_storeroom` — no enemies; traversing it reveals the escape route before Jacob needs it under pressure.

**ALARM TRANSFORMATION setup:**
- `alarm_raised` → Baranov repositions from exterior to `front_entrance` (dangerous to enter)
- Petrov stays in `ground_floor_corridor`, now alert (addendum confirms heightened state)
- `service_corridor` → `basement_storeroom` → `side_alley` remains unguarded under any alarm state

---

### Climax (Act 4)

```
Rooms: second_floor_landing, kuznetsov_room
Enemies: Volkov (patrol, second_floor_landing ↔ kuznetsov_room, cycle 6, startOffset 3) — PATROL WINDOW
Key items: cane (visible, kuznetsov_room — Kuznetsov's own; using on kuznetsov examine target sets mobility_aid)
Key flags: defector_secured (set by interacting with kuznetsov examine target)
           mobility_aid (set by using wheelchair OR cane on kuznetsov examine target)
Exits in: stairwell → second_floor_landing (stairwell_door_open required going up)
Exits out:
  second_floor_landing → ground_floor_corridor (stairwell, always open going down)
  second_floor_landing → service_corridor (service stairs, requires mobility_aid global flag)
  second_floor_landing ↔ kuznetsov_room (patrol window)
Chokepoint: Volkov's 6-turn patrol window — must time entry into kuznetsov_room
```

Kuznetsov is awake, dressed, waiting. He says nothing about the hip. The cane is by the window. The `interact` on the kuznetsov examine target sets `defector_secured`. Using the wheelchair (if brought from medical_room) or the cane on `kuznetsov` sets `mobility_aid`, enabling the service stairs exit.

Volkov can be timed (PATROL WINDOW) or talked at if the player attempts a bluff. Primary tension: the timer and Volkov's 6-turn cycle.

---

### Escape Leg (Act 5)

```
Route A (front exit — dangerous on alarm):
  Retrace: second_floor_landing → ground_floor_corridor → front_entrance → neustiftgasse → side_alley
  Threatened by: alarm_raised repositions Baranov to front_entrance (detection/combat threat on entry)

Route B (kitchen escape — Zima patrol):
  ground_floor_corridor → kitchen → service_yard → side_alley
  Always available from ground floor; Zima patrol is the obstacle (timing required)
  Note: inner_door_unlocked is needed for the kitchen → ground_floor_corridor direction only;
  the ground_floor_corridor → kitchen exit has no requirement, so this route is accessible to all Jacob builds

Route C (service stairs — clean but gated):
  second_floor_landing → service_corridor → basement_storeroom → side_alley
  Requires: mobility_aid global flag (wheelchair or cane used on kuznetsov)
  Always unguarded; bypasses both Baranov and Zima entirely

Extraction point: side_alley (the same room Jacob arrived through in Act 1)
  Interact: "Get Kuznetsov into the car" → mission_complete (requires defector_secured)
```

**WORLD-STATE BRANCH:** The same map routes differently under `alarm_raised`. Earlier choices determine which path is clean:
- Got `mobility_aid`? Route C (service stairs) is open, completely unguarded.
- No alarm raised? All routes viable; front entrance is fastest.
- Alarm raised, no `mobility_aid`? Route B (kitchen, Zima patrol) survives without special preparation. Route A goes through Baranov.

The extraction car in `side_alley` was visible during the approach. Addendum activates on `defector_secured`: the Peugeot's engine turns over. The driver has seen you. The interact sets `mission_complete`.

---

### End Scene (Act 6)

Renderer text via `debriefLine()`. Alderton's accounting. Flag variations:
- `alarm_raised`: *"The consulate lodged a complaint. Vienna station is being quiet about it."*
- `visitor_logged` (no alarm): *"There's a name in their book. We'll arrange for it to disappear."*
- Clean extraction: *"Kuznetsov is in a safe house outside the city. The doctors say the hip is manageable."*
- Time remaining ≤ 10 turns: *"You were four minutes ahead of the duty officer. We'll call that a margin."*

---

## 5. Room Detail

### whitehall_office

```
Label: Section Office, Whitehall
Description: The same office. Rain against the same sash windows. Alderton is at his desk,
  a street plan of the fourth district open in front of him — the consulate building circled
  in red ink. He closes the folder when Jacob enters.
Addenda: none
Exits: "Depart for Vienna" → neustiftgasse (requires alderton_briefed)
Items (visible): none
Items (hidden): none
Examine targets: alderton (interact → alderton_briefed), consulate_plan, briefing_window
Search difficulty: —
```

### neustiftgasse

```
Label: Neustiftgasse
Description: A respectable street in the fourth district. Wide pavements, grey stone, the
  yellow stucco of the consulate building ahead. A lamp post casts a yellow oval on the wet
  cobbles. The consulate entrance is thirty metres ahead. The side alley is to the left.
Addenda:
  — alarm_raised: "A light has come on in an upper window. Someone inside is moving fast."
Exits:
  — "Back to the briefing office" → whitehall_office
  — "Duck into the side alley" → side_alley
  — "Cross the forecourt to the consulate entrance" → front_entrance
Items (visible): none
Items (hidden): none
Examine targets: consulate_exterior, baranov_exterior, kitchen_light
Search difficulty: —
```

### side_alley

```
Label: Side Alley
Description: A narrow alley between the consulate and the building next door. Dustbins, a
  drainpipe, the smell of wet brick. A grey Peugeot is parked where the alley meets the far
  street, engine off.
Addenda:
  — defector_secured: "The Peugeot's engine turns over. The driver has seen you."
Exits:
  — "Back to the street" → neustiftgasse
  — "Down the alley to the service entrance" → service_yard
Items (visible): none
Items (hidden): wire
Examine targets: peugeot (interact → mission_complete/failed), service_door_exterior, alley_drain
Search difficulty: 1
```

### front_entrance

```
Label: Consulate Entrance Hall
Description: A panelled entrance hall, red carpet worn to grey in the centre, the Soviet coat
  of arms on the wall behind a reception desk. A young woman in a grey suit sits at the desk,
  a visitor's register open in front of her. The corridor beyond requires a signature.
Addenda:
  — alarm_raised: "Baranov is at the entrance, coat open, watching the door."
  — visitor_logged: "Your name is in the register."
Exits:
  — "Back to the street" → neustiftgasse
  — "Through to the corridor" → ground_floor_corridor (requires visitor_logged global flag)
Items (visible): none
Items (hidden): none
Examine targets: receptionist (interact → visitor_logged), visitor_register, coat_of_arms
Search difficulty: —
```

### service_yard

```
Label: Service Yard
Description: A narrow yard between the consulate and a blank stone wall. Wooden pallets stacked
  against the building, a rubbish bin, a drain. The service door is immediately ahead. No lights.
Addenda:
  — alarm_raised: "A door bangs somewhere above. A light has come on in the upper floors."
Exits:
  — "Back to the alley" → side_alley
  — "Through the service door" → kitchen
Items (visible): none
Items (hidden): none
Examine targets: service_door, pallets
Search difficulty: —
```

### kitchen

```
Label: Consulate Kitchen
Description: A working kitchen, larger than expected. Industrial range, stainless worktops,
  the smell of garlic and cleaning fluid. The evening staff have gone — equipment cooling,
  lights on. A door on the far wall leads into the consulate corridor. It is locked.
Addenda:
  — alarm_raised: "Voices from the corridor beyond the inner door. Someone is running."
  — inner_door_unlocked: "The inner door to the corridor stands open."
Exits:
  — "Back through the service door" → service_yard
  — "Through the inner door" → ground_floor_corridor (requires inner_door_unlocked room flag)
Items (visible): none
Items (hidden): service_key
Examine targets: inner_door (interact: safecracking ≥ 2 → inner_door_unlocked), kitchen_range, duty_roster_kitchen
Search difficulty: 2
Notes: wire and service_key both have usableOn: ["inner_door"] — either unlocks the door directly
```

### ground_floor_corridor

```
Label: Ground Floor Corridor
Description: A plastered corridor, strip lighting, numbered doors. The carpet runner is a
  different shade of red than the entrance hall. Petrov stands near the far end, weight on one
  foot, looking at nothing in particular.
Addenda:
  — alarm_raised: "Petrov has moved to the corridor entrance, hand on his sidearm."
  — stairwell_door_open: "The stairwell door is unlocked."
Exits:
  — "Back to the entrance hall" → front_entrance
  — "Through to the kitchen" → kitchen
  — "Duty office" → duty_office (blockedBy: consulate_guard)
  — "Staff common room" → staff_common_room
  — "Medical room" → medical_room
  — "Service corridor" → service_corridor
  — "Stairwell to the upper floor" → second_floor_landing (requires stairwell_door_open room flag)
Items (visible): none
Items (hidden): stairwell_key_b (revealed by key_cabinet_open)
Examine targets: notice_board, stairwell_door, key_cabinet (interact: safecracking ≥ 2 → key_cabinet_open)
Search difficulty: 3
Reveals: { flag: key_cabinet_open, itemId: stairwell_key_b }
```

### duty_office

```
Label: Duty Officer's Office
Description: A small room at the end of the corridor — a desk, a bookshelf, a filing cabinet.
  A framed commendation on the wall. Two chairs facing the desk, angled inward as if waiting
  for an argument to resume.
Addenda:
  — alarm_raised: "The bookshelf has been shoved against the door from inside. Petrov left in a hurry."
Exits:
  — "Back to the corridor" → ground_floor_corridor
Items (visible): none
Items (hidden): none
Examine targets: duty_desk, commendation, petrov_letter
Search difficulty: 1
Notes: Petrov must be neutralised to access. Reward for dealing with the chokepoint is
  character detail and the safe room feel — Petrov's personal items are here.
```

### staff_common_room

```
Label: Staff Common Room
Description: A low table, four chairs, a kettle on a sideboard. Magazines in Russian,
  a chess set mid-game on the windowsill. A roster on the wall shows who is on post tonight.
Addenda:
  — alarm_raised: "The chess pieces have been knocked to the floor. Someone left fast."
Exits:
  — "Back to the corridor" → ground_floor_corridor
Items (visible): none
Items (hidden): stairwell_key, staff_id
Examine targets: roster, chess_set, staff_kettle
Search difficulty: 1
Notes: Safe room. No enemies. Hidden stairwell_key and staff_id reward careful search.
```

### medical_room

```
Label: Medical Room
Description: A single-bed clinic. Bandages, a first aid cabinet on the wall. A wheelchair
  in the corner, a cane leaning against it. Irina Molova, the duty nurse, is at the desk
  reading, back to the door.
Addenda:
  — alarm_raised: "Irina has gone. The bandages on the desk are untouched."
Exits:
  — "Back to the corridor" → ground_floor_corridor
Items (visible): wheelchair
Items (hidden): none
Examine targets: irina, first_aid_cabinet, medical_notes
Enemies: consulate_nurse (Irina Molova)
Search difficulty: 2
```

### service_corridor

```
Label: Service Corridor
Description: A narrow back corridor behind the main rooms — pipes, a junction box, the smell
  of old paint. A single bulb on a wire. Connects to the basement storeroom at the far end.
Addenda:
  — alarm_raised: "A distant door banging in the stairwell. The pipes are cold."
Exits:
  — "Back to the main corridor" → ground_floor_corridor
  — "Down to the basement storeroom" → basement_storeroom
Items (visible): none
Items (hidden): none
Examine targets: junction_box, service_pipe, service_notice
Search difficulty: —
```

### basement_storeroom

```
Label: Basement Storeroom
Description: Low ceiling, bare concrete. Cardboard boxes, a broken trolley, a mop in a bucket.
  A steel door in the far wall opens outward onto the alley — the kind that only unlocks from
  inside.
Addenda:
  — alarm_raised: "The building is moving above you. You can hear them on the stairs."
Exits:
  — "Back up the service corridor" → service_corridor
  — "Out the service door to the alley" → side_alley
Items (visible): none
Items (hidden): none
Examine targets: cardboard_boxes, service_door_inside, broken_trolley
Search difficulty: 1
```

### second_floor_landing

```
Label: First Floor Landing
Description: Carpeted, quieter than the ground floor. Four numbered doors, all closed. A fire
  door at the end of the landing leads to the service stairs. Volkov moves between here and
  the far room on a slow circuit.
Addenda:
  — alarm_raised: "Footsteps from below. Volkov has heard something."
Exits:
  — "Back down the stairwell" → ground_floor_corridor
  — "Service stairs" → service_corridor (requires mobility_aid global flag)
  — "Room 14" → kuznetsov_room
Items (visible): none
Items (hidden): none
Examine targets: fire_door, landing_window, room_numbers
Enemies: upper_floor_guard (Volkov — patrol)
Search difficulty: —
```

### kuznetsov_room

```
Label: Room 14
Description: A single room — bed, a chair, a small desk. A coat is on the bed, a case beside it.
  A man in his early fifties sits by the window in the dark. He stands when Jacob enters. The hip
  is immediately obvious. A walking cane is propped against the windowsill.
Addenda:
  — defector_secured: "Kuznetsov is ready. He has been ready since yesterday."
  — alarm_raised: "Voices in the building. Kuznetsov hears them too. His expression does not change."
Exits:
  — "Back to the landing" → second_floor_landing
Items (visible): cane
Items (hidden): none
Examine targets: kuznetsov (interact → defector_secured), room_window, kuznetsov_case
Search difficulty: —
Notes: Using wheelchair or cane on "kuznetsov" examine target sets mobility_aid global flag.
```

---

## 6. Enemy Roster

| ID | Name | Template | Room | Patrol | alarmRoomId | Inventory | Notes |
|----|------|----------|------|--------|-------------|-----------|-------|
| exterior_guard | Baranov | guard | neustiftgasse | neustiftgasse ↔ side_alley, cycle 8, offset 0 | front_entrance | makarov_pistol | Repositions to front_entrance on alarm, becoming a direct threat to front escape |
| kitchen_guard | Zima, M. | guard | kitchen | kitchen ↔ service_yard, cycle 6, offset 0 | — | Relevant on entry and on kitchen escape route; no alarmRoomId |
| consulate_guard | Petrov | guard | ground_floor_corridor | none (stationed) | — | makarov_pistol, stairwell_key_c | CHOKEPOINT GUARD; blocks duty_office exit while active |
| upper_floor_guard | Volkov | guard | second_floor_landing | second_floor_landing ↔ kuznetsov_room, cycle 6, offset 3 | — | — | PATROL WINDOW for Act 4 climax |
| consulate_nurse | Irina Molova | civilian | medical_room | none | — | — | Ambient civilian; bluffable; blocks comfortable wheelchair pickup |

---

## 7. Item Roster

| ID | Label | Type | Location | Effect | usableOn | Notes |
|----|-------|------|----------|--------|---------|-------|
| diplomatic_credentials | Diplomatic Credentials | document | Starting inventory | — | — | Required by receptionist interactRequires; not consumed |
| wire | Lockpick Wire | gadget | side_alley (hidden) | set_room_flag: inner_door_unlocked | inner_door | No skill check required |
| service_key | Service Key | keycard | kitchen (hidden) | set_room_flag: inner_door_unlocked | inner_door | Found during Zima's PATROL WINDOW |
| stairwell_key | Stairwell Key | keycard | staff_common_room (hidden) | set_room_flag: stairwell_door_open | stairwell_door | Route 1 of MULTI-ROUTE UNLOCK |
| stairwell_key_b | Stairwell Key | keycard | ground_floor_corridor (hidden, key_cabinet_open reveal) | set_room_flag: stairwell_door_open | stairwell_door | Route 2: safecracking ≥ 2 on key_cabinet |
| stairwell_key_c | Stairwell Key | keycard | Petrov inventory | set_room_flag: stairwell_door_open | stairwell_door | Route 3: neutralise/loot Petrov |
| staff_id | Staff Identity Card | document | staff_common_room (hidden) | — | — | Improves bluff attempts; carried for talk action |
| wheelchair | Wheelchair | gadget | medical_room (visible) | set_global_flag: mobility_aid (via targetEffects on kuznetsov) | kuznetsov | Use on kuznetsov examine target in kuznetsov_room |
| cane | Walking Cane | gadget | kuznetsov_room (visible) | set_global_flag: mobility_aid (via targetEffects on kuznetsov) | kuznetsov | Fallback if player skipped medical_room |
| makarov_pistol | Makarov Pistol | weapon_ranged | Petrov inventory, Baranov inventory | — | — | Enemy loot |

---

## 8. Flags Reference

| Flag | Set by | Checked by | Meaning |
|------|--------|------------|---------|
| alderton_briefed | alderton interact | whitehall_office exit | Briefing acknowledged |
| visitor_logged | receptionist interact (requires diplomatic_credentials) | front_entrance exit to corridor; end scene; front_entrance addendum | Paper trail created |
| inner_door_unlocked | wire/service_key use on inner_door; safecracking ≥ 2 interact on inner_door | kitchen exit to corridor | Kitchen inner door open |
| key_cabinet_open | key_cabinet interact (safecracking ≥ 2) | ground_floor_corridor reveals (stairwell_key_b) | Key cabinet opened |
| stairwell_door_open | any stairwell_key variant used on stairwell_door | ground_floor_corridor exit to second_floor_landing | Stairwell unlocked |
| mobility_aid | wheelchair or cane targetEffect on kuznetsov | second_floor_landing exit to service_corridor | Jacob has means to support Kuznetsov on stairs |
| defector_secured | kuznetsov interact | peugeot interact (set_global_flag_if condition); side_alley addendum | Kuznetsov agreed; ready to extract |
| alarm_raised | detection/noise system | room addenda throughout; Baranov alarmRoomId; end scene | Building on alert |
| mission_complete | peugeot interact (defector_secured true) | engine gameOver check | Win condition |
| mission_failed | peugeot interact (defector_secured false) | engine gameOver check | Jacob left without Kuznetsov |

---

## 9. Protagonist Starting State

- **Starting room:** whitehall_office
- **Health:** 10
- **Stats:** STR 3 / AGI 4 / INT 3 / CHA 3
- **Skills:** all initialise at 0
- **Starting inventory:** diplomatic_credentials (small[0])
