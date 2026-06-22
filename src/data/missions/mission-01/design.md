# Mission 01 — The Cipher Machine

## 1. Goal

- **What Jacob is after** — Photograph the internals of a Soviet next-generation cipher device (the SOVA-7) before its cipher officer returns from dinner
- **Why it matters** — GCHQ can crack all Soviet signals traffic for months until they rotate the machine; without the photographs, a NATO naval operation goes dark
- **Win condition** — Two steps: (1) use `camera` on `sova_7` → sets `machine_photographed`; (2) interact with `extraction_vehicle` on `mountain_road` → sets `mission_complete`. Escape is mandatory.
- **Deadline** — 80 turns (cipher officer returns from dinner)

---

## 2. Five-Act Structure

| Act | Area | Purpose | Notes |
|-----|------|---------|-------|
| Approach | Mountain road / perimeter fence | Establish tone, tutorial movement and search | No combat expected; one guard on the fence |
| Infiltration | Outpost exterior / service entrance | First stealth challenge — getting inside | Keycard or ventilation route; one roaming guard |
| Exploration | Ground floor corridors + rooms | Find the cipher room key and the camera | Two guards; side rooms with alternative routes and loot |
| Climax | Cipher room | Photograph the SOVA-7 | Locked door requires cipher_room_key; no enemies — pure time pressure |
| Escape | Reverse the entry route | Familiar rooms, different world state | Alarm raised → Volkov blocks loading bay; ventilation shaft is the only safe route |

The escape reuses all entry rooms. `alarm_raised` changes guard positions and closes the loading bay exit, making the ventilation shaft the only safe path back.

---

## 3. Map Shape

**Hub-and-spoke.** The ground floor corridor is the hub. Spokes: mess hall, comms room, duty office, cipher room (locked). The perimeter and service yard form a short linear lead-in before the hub opens up.

```
mountain_road
    ↕
perimeter_fence
    ↕
service_yard ←→ ventilation_shaft
    ↕                   ↕
loading_bay     ground_floor_corridor
    ↕          ↙        ↓        ↘
    └─────────→    mess_hall  comms_room  duty_office
                                              ↓
                                         cipher_room
```

---

## 4. Area Plans

### Approach (Act 1)

```
Rooms: mountain_road, perimeter_fence
Enemies: fence_guard / Pvt. Morozov (short patrol looping past fence)
Key items: wire_cutters (hidden in ditch — search reward)
Key flags: fence_cut (wire_cutters used on fence → crawl-through exit available)
Exits in: game start
Exits out: → service_yard (fence_cut OR Morozov neutralised)
Chokepoint: getting past Morozov unseen
```

### Infiltration (Act 2)

```
Rooms: service_yard, loading_bay, ventilation_shaft
Enemies: Sgt. Volkov (patrols service_yard → loading_bay, cycle 6 turns)
Key items: service_keycard (Volkov's inventory)
Key flags: loading_bay_door_open (service_keycard on keycard_reader)
Exits in: ← perimeter_fence
Exits out: → ground_floor_corridor (via loading bay door OR ventilation shaft — both always available)
Chokepoint: keycard is on Volkov — loot, bluff, or bypass entirely via ventilation
```

### Exploration (Act 3)

```
Rooms: ground_floor_corridor, mess_hall, comms_room, duty_office
Enemies: Cpl. Petrov (stationary, corridor), Pvt. Nikitin (stationary, comms_room)
Key items: camera (duty_office desk, visible), cipher_room_key (duty_office locked drawer)
Key flags: drawer_unlocked (lock_picking on duty_office_drawer, or use duty_office_key)
Alternative: duty_office_key in mess_hall (search reward); cipher_room_key duplicate in comms_room (high-risk search)
Exits in: ← loading_bay / ventilation_shaft
Exits out: → cipher_room (requires cipher_room_key in inventory)
Chokepoint: Petrov blocks the duty office wing; locked drawer needs lock_picking or the mess hall key
```

### Climax (Act 4)

```
Rooms: cipher_room
Enemies: none
Key items: sova_7 (examine target); use camera on sova_7 → machine_photographed
Key flags: machine_photographed
Exits in: ← ground_floor_corridor (requires cipher_room_key)
Exits out: → ground_floor_corridor
Chokepoint: pure time pressure — turns spent getting here vs. the deadline
```

### Escape (Act 5)

```
Rooms: (reuse all entry rooms in reverse)
Enemies: same guards, repositioned if alarm_raised
  — Volkov: if alarm_raised, stationed at loading_bay (alert, will ambush)
  — Petrov: if alarm_raised, patrols corridor aggressively
  — Morozov: if alarm_raised, awareness escalated to alert at perimeter_fence
Key flags: machine_photographed required to trigger extraction; alarm_raised closes loading_bay exit
Normal route: cipher_room → corridor → loading_bay → service_yard → fence → mountain_road
Alarm route: cipher_room → corridor → ventilation_shaft (bidirectional) → service_yard → fence → mountain_road
Win: interact with extraction_vehicle on mountain_road (requires machine_photographed)
Chokepoint: if alarm raised, Volkov's ambush in loading_bay forces the ventilation detour
```

---

## 4b. Discovery Risk (Prerequisite Engine Feature)

Each downed guard (unconscious or dead) has a per-turn chance of being found by another guard. When discovered:
- All active guards escalate to `awareness: 'alert'`
- Global flag `alarm_raised` is set
- A message is shown to the player

`discoveryRisk` is a 0–1 probability on `EnemyTemplate`, checked each turn per downed enemy. Default 0 (no risk) so existing missions are unaffected.

Guards in this mission use `discoveryRisk: 0.1` (10% per turn per downed guard).

Morozov's patrol route loops past the cut fence — he discovers it naturally when his circuit brings him back, with no separate timer needed.

**Engine work required before mission JSON:** `discoveryRisk` field on `EnemyTemplate`; `checkDiscoveries` step in the `processAction` pipeline. Tracked as PR #18.

---

## 5. Room Detail

### mountain_road

```
Label: Mountain Road
Description: A dirt track through pine trees. The outpost fence is visible ahead,
  lit by a single floodlight. Somewhere in the darkness, an engine ticks as it cools.
Addenda:
  — machine_photographed: "The car in the treeline flashes its lights once. Your ride is waiting."
Exits:
  — "Approach the fence" → perimeter_fence
  — (escape) "Return to the treeline" → [end — interact with extraction_vehicle triggers mission_complete]
Items (visible): none
Items (hidden): none
Examine targets:
  — treeline: "Pine trees, thick enough to hide a car. Or a man."
  — extraction_vehicle (visible only when machine_photographed flag set via addendum cue):
      description: "A black Volga, engine off, driver watching the fence."
      interactLabel: "Get in"
      effect: [set_global_flag: mission_complete]
Search difficulty: —
Notes: Starting room. extraction_vehicle interact only becomes meaningful once machine_photographed is set;
  without it the driver shakes his head (message: "Not without the photographs.") — requires engine
  support for conditional interact or a guard-style flag check on the effect.
```

### perimeter_fence

```
Label: Perimeter Fence
Description: Chain-link topped with barbed wire, ten feet high. A guardhouse sits
  to the east, light on inside. The fence runs out of sight in both directions.
Addenda:
  — fence_cut: "A gap in the lower wire marks where you've been through."
  — alarm_raised: "A siren wails from inside the compound."
Exits:
  — "Return to the road" → mountain_road
  — "Crawl through the fence" → service_yard [requires fence_cut OR fence_guard neutralised]
Items (visible): none
Items (hidden): none
Examine targets:
  — fence: "Chain-link, well-maintained. The lower section near the ditch looks weaker."
      interactLabel: "Cut through" [requires wire_cutters in inventory]
      effect: [set_room_flag: fence_cut]
  — guardhouse: "A small booth. Light on, shadow moving inside. Morozov."
Enemies: fence_guard (Pvt. Morozov)
Search difficulty: —
```

### service_yard

```
Label: Service Yard
Description: A concrete yard between the fence and the building. A bulkhead light
  flickers above the loading bay door. Supply crates are stacked along the near wall.
Addenda:
  — alarm_raised: "The yard is flooded with light. Someone has hit the exterior floods."
Exits:
  — "Back to the fence" → perimeter_fence
  — "Loading bay door" → loading_bay [requires loading_bay_door_open]
  — "Ventilation grille" → ventilation_shaft [always available]
Items (visible): none
Items (hidden): none
Examine targets:
  — crates: "Wooden supply crates, stencilled in Cyrillic. Good cover, nothing useful."
  — loading_bay_door: "A heavy steel door with a keycard reader mounted beside it. Red light."
  — bulkhead_light: "Flickering on a short cycle. Annoying, but it helps."
Enemies: Sgt. Volkov (patrol: service_yard → loading_bay, cycle 6 turns)
Search difficulty: —
```

### loading_bay

```
Label: Loading Bay
Description: Pallets, a forklift that hasn't moved in years, the smell of diesel.
  A door at the far end leads into the building proper.
Addenda:
  — alarm_raised: "Volkov is posted here, rifle unslung."
Exits:
  — "Back to the yard" → service_yard
  — "Into the building" → ground_floor_corridor [always open once inside]
Items (visible): none
Items (hidden): maintenance_key [search reward — opens supply_cabinet in comms_room]
Examine targets:
  — forklift: "Soviet-era, rusted solid. Not going anywhere."
  — pallets: "Empty. Whatever was here has been moved inside."
  — keycard_reader: "Same model as the exterior. The door is open from this side."
Enemies: Sgt. Volkov (patrol; if alarm_raised, stationed here and alert)
Search difficulty: 2
Notes: If alarm_raised, Volkov is stationed here and alert — entering triggers guardAmbush.
  Ventilation shaft is the safe alternative on escape.
```

### ventilation_shaft

```
Label: Ventilation Shaft
Description: Tight crawl space, barely wide enough for your shoulders. The metal
  is cold. Air moves in both directions depending on which fan is running.
Addenda:
  — alarm_raised: "The ventilation fan kicks into high gear, air rushing past your face."
Exits:
  — "Crawl toward the service yard" → service_yard
  — "Crawl toward the corridor" → ground_floor_corridor
Items (visible): none
Items (hidden): none
Examine targets:
  — shaft_junction: "A junction. Through the grille below you can hear voices — the comms room,
      directly beneath. Two men, radio static."
Search difficulty: —
Notes: Bidirectional — used in both directions during infiltration and escape.
  No enemies can follow Jacob in here.
```

### ground_floor_corridor

```
Label: Ground Floor Corridor
Description: Long, low-ceilinged. Strip lighting, linoleum floor, numbered doors.
  At the far end, Petrov stands with his back to the wall, rifle slung.
Addenda:
  — alarm_raised: "Red warning lights pulse along the ceiling. Somewhere a door slams."
Exits:
  — "Loading bay" → loading_bay
  — "Ventilation grille (low, near the loading bay end)" → ventilation_shaft
  — "Mess hall" → mess_hall [no lock]
  — "Comms room" → comms_room [no lock]
  — "Duty office corridor" → duty_office [requires Petrov neutralised or not alert]
Items (visible): none
Items (hidden): none
Examine targets:
  — notice_board: "A patrol rota, handwritten. Volkov's name appears every six entries."
  — petrov: "Cpl. Petrov. Armed, bored, but alert. He has a clear line of sight down the corridor."
Enemies: Cpl. Petrov (stationary; if alarm_raised, patrols full corridor length)
Search difficulty: 3 [Petrov present]
Notes: The duty_office exit should be gated — Petrov blocks it when active and aware.
  Ventilation shaft exit here is the arrival point from infiltration and escape route.
```

### mess_hall

```
Label: Mess Hall
Description: Four tables, benches, the smell of boiled cabbage. The samovar in the
  corner is warm. The men are at dinner somewhere else — this room is empty.
Addenda:
  — alarm_raised: "Chairs pushed back, bowls half-eaten. Whoever was here left in a hurry."
Exits:
  — "Back to the corridor" → ground_floor_corridor
Items (visible): none
Items (hidden): duty_office_key [search reward — left on a table by a careless officer]
Examine targets:
  — samovar: "Still warm. Dinner started recently. You don't have long."
  — jacket: "A guard's jacket on a hook. Empty pockets, wrong size."
  — table: "Bowls of food, barely touched."
Enemies: none
Search difficulty: 1
Notes: Safe room. duty_office_key here is the low-risk alternative to lock-picking the drawer.
```

### comms_room

```
Label: Comms Room
Description: Banks of radio equipment lining three walls. Pvt. Nikitin sits at the
  main console with headphones on, back to the door, absorbed in traffic.
Addenda:
  — alarm_raised: "Nikitin is on his feet, shouting into a handset."
Exits:
  — "Back to the corridor" → ground_floor_corridor
Items (visible): none
Items (hidden): cipher_room_key [duplicate — high-risk search with Nikitin present]
Examine targets:
  — radio_equipment: "Soviet military band. Encrypted traffic, layered and continuous."
  — nikitin: "Headphones on, pen moving. He hasn't heard you. Keep it that way."
  — supply_cabinet: "A locked metal cabinet on the far wall."
      interactLabel: "Unlock with maintenance key" [requires maintenance_key]
      effect: [reveals cipher_room_key duplicate as takeable item]
Enemies: Pvt. Nikitin (stationary)
Search difficulty: 4 [Nikitin present, facing away but in the room]
Notes: Can be avoided entirely. Three routes to cipher_room_key:
  (1) lock-pick duty_office drawer, (2) find duty_office_key in mess_hall,
  (3) high-risk search here or open supply_cabinet with maintenance_key.
```

### duty_office

```
Label: Duty Officer's Office
Description: Small and cluttered. A desk covered in papers, a framed photograph
  of a family — summer, a lake. The camera sits on the corner of the desk.
Addenda:
  — drawer_unlocked: "The desk drawer hangs open."
Exits:
  — "Back to the corridor" → ground_floor_corridor
  — "Cipher room door" → cipher_room [requires cipher_room_key in inventory]
Items (visible): camera
Items (hidden): cipher_room_key [in locked drawer; accessible once drawer_unlocked]
Examine targets:
  — desk: "Papers, a coffee cup, an ashtray. Someone works long hours here."
  — family_photo: "A man in uniform, a woman, two children. A lake somewhere warm."
  — duty_office_drawer:
      description: "A locked drawer. The lock looks standard."
      interactLabel: "Pick the lock" [requires lock_picking skill ≥ 2; sets drawer_unlocked]
      — alt: use duty_office_key [sets drawer_unlocked without skill check]
Enemies: none
Search difficulty: 1
```

### cipher_room

```
Label: Cipher Room
Description: Temperature-controlled, barely larger than a cupboard. The hum of
  electronics, cool recycled air. The SOVA-7 sits on a dedicated table under a
  desk lamp — rotors, key plugs, a Soviet star on the housing. No one is here.
Addenda:
  — machine_photographed: "The camera is back in your pocket. You have what you came for."
  — alarm_raised: "Muffled shouting from somewhere in the building. You need to move."
Exits:
  — "Back to the corridor" → ground_floor_corridor
Items (visible): none
Items (hidden): none
Examine targets:
  — sova_7:
      description: "The SOVA-7. Heavier than it looks. The rotors are set for today's key.
        GCHQ will want every angle."
      interactLabel: "Photograph the machine" [requires camera in inventory]
      effect: [set_global_flag: machine_photographed]
  — wall_clock: "Quarter past eight. Dinner ends at nine. Probably."
  — filing_cabinet: "Locked. Not worth the time."
Enemies: none
Search difficulty: —
Notes: No enemies, no items. Tension is entirely the turn counter. The camera must
  be in inventory — it is not consumed (gadget, no usableOn consumption).
```

---

## 6. Enemy Roster

| ID | Name | Template | Room | Patrol | Inventory | discoveryRisk | Notes |
|----|------|----------|------|--------|-----------|---------------|-------|
| fence_guard | Pvt. Morozov | guard | perimeter_fence | perimeter_fence → ditch → perimeter_fence, cycle 8 | none | 0.1 | Patrol loops past fence gap — discovers fence_cut naturally |
| roaming_guard | Sgt. Volkov | guard | service_yard | service_yard → loading_bay, cycle 6 | service_keycard | 0.1 | Carries keycard; if alarm_raised, stationed at loading_bay |
| corridor_guard | Cpl. Petrov | guard | ground_floor_corridor | none (alarm_raised: patrols full corridor) | none | 0.1 | Blocks duty office wing |
| comms_guard | Pvt. Nikitin | guard | comms_room | none | none | 0.1 | Can be avoided entirely; stationary, facing away |

---

## 7. Item Roster

| ID | Label | Type | Location | Effect | usableOn | Notes |
|----|-------|------|----------|--------|---------|-------|
| wire_cutters | Wire Cutters | gadget | mountain_road (hidden, ditch) | set_room_flag: fence_cut | fence | Not consumed |
| service_keycard | Service Keycard | keycard | Volkov inventory | set_room_flag: loading_bay_door_open | keycard_reader | |
| camera | Camera | gadget | duty_office (visible) | — | sova_7 | Not consumed; triggers machine_photographed via interact |
| cipher_room_key | Cipher Room Key | keycard | duty_office drawer (hidden, locked) | — | cipher_room_door | Primary route to cipher room |
| duty_office_key | Duty Office Key | keycard | mess_hall (hidden) | set_room_flag: drawer_unlocked | duty_office_drawer | Low-risk alternative to lock-picking |
| maintenance_key | Maintenance Key | keycard | loading_bay (hidden) | — | supply_cabinet | Opens supply cabinet in comms_room; reveals cipher_room_key duplicate |

---

## 8. Flags Reference

| Flag | Set by | Checked by | Meaning |
|------|--------|------------|---------|
| fence_cut | wire_cutters interact on fence | perimeter_fence crawl-through exit | Gap in fence available |
| loading_bay_door_open | service_keycard on keycard_reader | service_yard loading bay exit | Interior door unlocked |
| drawer_unlocked | lock_picking interact or duty_office_key | duty_office examine target | Drawer open; cipher_room_key revealed |
| machine_photographed | camera interact on sova_7 | extraction_vehicle interact; mountain_road addendum | Photos taken; extraction now available |
| mission_complete | extraction_vehicle interact (requires machine_photographed) | checkDeadlines() | Win condition |
| alarm_raised | checkDiscoveries() or loud/alarming noise | escape route exits; guard behaviour; room addenda | Guards repositioned; loading bay exit closed |

---

## 9. Protagonist Starting State

- **Starting room:** mountain_road
- **Health:** 10
- **Stats:** STR 3 / AGI 4 / INT 3 / CHA 2
- **Skills:** hand_to_hand 1, lock_picking 2, evasion 1
- **Starting inventory:** none (camera and wire_cutters must be found in the field)
