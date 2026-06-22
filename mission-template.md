# Mission Design Template

## Design Order

Design top-down: goal → structure → areas → room detail. Every room should have a reason to exist before writing JSON.

---

## 1. Goal

- **What Jacob is after** — the object, information, or person
- **Why it matters** — story stakes
- **Win condition** — what `set_global_flag` triggers `mission_complete`
- **Deadline** — how many turns before timeout (sets tension level)

---

## 2. Five-Act Structure

| Act | Purpose | Alarm state | Notes |
|-----|---------|-------------|-------|
| Approach | Low stakes, tutorial, tone-setting | Undetected | Exterior / entry route |
| Infiltration | First real stealth challenge | Undetected → Suspicious | Getting inside the building |
| Exploration | Longest section, patrols, side routes | Suspicious | Finding the goal |
| Climax | The goal itself | Any | Terminal, vault, confrontation |
| Escape | Time pressure, familiar rooms feel different | Alert / Lockdown | Can reuse entry rooms |

The escape leg reuses entry rooms where possible — same rooms, different world state (guards repositioned, flags changed, new exits open).

---

## 3. Map Shape

Choose one and note why:

- **Linear gauntlet** — one path, escalating guards. Easier to design and test.
- **Hub-and-spoke** — central area with wings. More player agency. Recommended: one locked wing to hint at scope without requiring 50 rooms.
- **Loop** — entry and exit paths diverge then rejoin. Good for escape reuse.

---

## 4. Area Plan

One section per act. For each:

```
### [Area Name] ([Act])

Rooms: [list room IDs or names]
Enemies: [who is here, patrol or stationary]
Key items: [what can be found]
Key flags: [what flags gate progress]
Exits in: [how the player arrives]
Exits out: [how the player proceeds]
Chokepoint: [the one moment of tension in this area]
```

---

## 5. Room Detail

Fill this in per room once the area plan is settled:

```
### [room_id]

Label: 
Description: 
Addenda: (flag → text)
Exits: (label → destination, requirements)
Items (visible): 
Items (hidden): 
Examine targets: 
Enemies: 
Search difficulty: 
Notes: 
```

---

## 6. Enemy Roster

| ID | Name | Template | Room | Patrol | Inventory | Notes |
|----|------|----------|------|--------|-----------|-------|

---

## 7. Item Roster

| ID | Label | Type | Location | Effect | usableOn |
|----|-------|------|----------|--------|---------|

---

## 8. Flags Reference

| Flag | Set by | Checked by | Meaning |
|------|--------|------------|---------|

---

## 9. Protagonist Starting State

- **Starting room:**
- **Health:**
- **Stats:** STR / AGI / INT / CHA
- **Skills:**
- **Starting inventory:**
