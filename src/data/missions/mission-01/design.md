# Mission 01 — The Cipher Machine

## 1. Goal

- **What Jacob is after** — Photograph the internals of a Soviet next-generation cipher device (the SOVA-7) before its cipher officer returns from dinner
- **Why it matters** — GCHQ can crack all Soviet signals traffic for months until they rotate the machine; without the photographs, a NATO naval operation goes dark
- **Win condition** — `set_global_flag: mission_complete` triggered by using the camera on the cipher machine
- **Deadline** — TBD turns (cipher officer returns from dinner; roughly 60–80 turns)

---

## 2. Five-Act Structure

| Act | Area | Purpose | Notes |
|-----|------|---------|-------|
| Approach | Mountain road / perimeter fence | Establish tone, tutorial movement and search | No combat expected; one guard on the fence |
| Infiltration | Outpost exterior / service entrance | First stealth challenge — getting inside | Keycard or ventilation route; one roaming guard |
| Exploration | Ground floor corridors + rooms | Find the cipher room key and the camera | Two guards; patrol routes; side rooms with loot |
| Climax | Cipher room | Photograph the SOVA-7 | Locked door; skill check or keycard; no enemies inside — but time is running out |
| Escape | Reverse the entry route | Familiar rooms, alarm possibly raised | If alarm is up, guards are repositioned; fence guard is now alert |

The escape reuses entry rooms. World state differs: a tripped alarm moves the roaming guard to block the main corridor, forcing the ventilation alternative.

---

## 3. Map Shape

**Hub-and-spoke.** The ground floor corridor is the hub. Spokes: mess hall, comms room, duty officer's office, cipher room (locked). The perimeter and entry form a short linear lead-in before the hub opens up.

---

## 4. Area Plans

### Approach (Act 1)

```
Rooms: mountain_road, perimeter_fence
Enemies: fence_guard (stationary, east side of fence)
Key items: wire_cutters (hidden in ditch near road — reward for searching)
Key flags: fence_cut (wire_cutters used on fence → unlocks crawl_through_fence exit)
Exits in: game start
Exits out: → service_yard (if fence_cut or fence_guard neutralised)
Chokepoint: getting past the fence guard unseen
```

### Infiltration (Act 2)

```
Rooms: service_yard, loading_bay, ventilation_shaft
Enemies: roaming_guard (patrols service_yard → loading_bay, cycle 6 turns)
Key items: service_keycard (on roaming_guard's inventory)
Key flags: loading_bay_door_open (service_keycard used on keycard_reader)
Exits in: ← perimeter_fence
Exits out: → ground_floor_corridor (via loading bay door or ventilation shaft)
Chokepoint: keycard is on the guard — loot, bluff, or bypass via ventilation
```

### Exploration (Act 3)

```
Rooms: ground_floor_corridor, mess_hall, comms_room, duty_office
Enemies: corridor_guard (stationary, corridor), comms_guard (stationary, comms_room)
Key items: camera (desk in duty_office), cipher_room_key (locked drawer in duty_office)
Key flags: drawer_unlocked (lock_picking skill check on duty_office_drawer)
Exits in: ← loading_bay / ventilation_shaft
Exits out: → cipher_room (requires cipher_room_key)
Chokepoint: duty office — need to get past corridor_guard and find/open the locked drawer
```

### Climax (Act 4)

```
Rooms: cipher_room
Enemies: none
Key items: sova_7 (examine target — the machine itself)
Key flags: machine_photographed → mission_complete
Exits in: ← ground_floor_corridor (requires cipher_room_key)
Exits out: → ground_floor_corridor
Chokepoint: the turn cost of photographing + remaining deadline
```

### Escape (Act 5)

```
Rooms: (reuse ground_floor_corridor, loading_bay, service_yard, perimeter_fence, mountain_road)
Enemies: same guards, repositioned if alarm raised
Key flags: alarm_raised (changes corridor_guard patrol; blocks loading_bay_door_open exit if alarm up)
Exits in: ← cipher_room
Exits out: → mountain_road (mission end room)
Chokepoint: if alarm is raised, main corridor is blocked — must use ventilation shaft instead
```

---

## 5. Room Detail

_To be filled in once area plan is approved._

---

## 6. Enemy Roster

| ID | Name | Template | Room | Patrol | Inventory | Notes |
|----|------|----------|------|--------|-----------|-------|
| fence_guard | Pvt. Morozov | guard | perimeter_fence | none | none | canBeBluffed; can be neutralised silently |
| roaming_guard | Sgt. Volkov | guard | service_yard | service_yard→loading_bay, cycle 6 | service_keycard | Keycard carrier |
| corridor_guard | Cpl. Petrov | guard | ground_floor_corridor | none | none | Blocks access to duty office wing |
| comms_guard | Pvt. Nikitin | guard | comms_room | none | none | Stationary; can be avoided entirely |

---

## 7. Item Roster

| ID | Label | Type | Location | Effect | usableOn |
|----|-------|------|----------|--------|---------|
| wire_cutters | Wire Cutters | gadget | perimeter_fence (hidden) | set_room_flag: fence_cut | fence |
| service_keycard | Service Keycard | keycard | roaming_guard inventory | set_room_flag: loading_bay_door_open | keycard_reader |
| camera | Camera | gadget | duty_office desk | — | sova_7 |
| cipher_room_key | Cipher Room Key | keycard | duty_office drawer (locked) | — | cipher_room_door |

---

## 8. Flags Reference

| Flag | Set by | Checked by | Meaning |
|------|--------|------------|---------|
| fence_cut | wire_cutters on fence | perimeter_fence exit | Hole in fence; crawl-through exit available |
| loading_bay_door_open | service_keycard on keycard_reader | loading_bay exit | Interior door unlocked |
| drawer_unlocked | lock_picking check | duty_office examine target | Desk drawer opened; cipher_room_key accessible |
| machine_photographed | camera on sova_7 | — | Triggers mission_complete |
| mission_complete | machine_photographed | checkDeadlines() | Win condition |
| alarm_raised | loud/alarming noise event | escape route exits | Repositions corridor_guard; closes loading bay exit |

---

## 9. Protagonist Starting State

- **Starting room:** mountain_road
- **Health:** 10
- **Stats:** STR 3 / AGI 4 / INT 3 / CHA 2
- **Skills:** hand_to_hand 1, lock_picking 2, evasion 1
- **Starting inventory:** none (camera must be found in the field)
