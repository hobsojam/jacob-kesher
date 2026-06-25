Design a mission skeleton for Jacob Kesher using the level design playbook.

## Input

The mission premise is: $ARGUMENTS

If no premise is provided, ask for one before proceeding. You need at minimum: what Jacob is after, where the mission takes place, and the win condition.

## Process

1. Read @level-design-playbook.md in full before doing anything else.
2. Read @mission-template.md for the output format.
3. Produce sections 1–4 of the mission template (Goal, Five-Act Structure, Map Shape, Area Plans).
4. Stop. Do not write JSON, do not write room detail, do not write enemy or item rosters. Wait for approval of the skeleton before proceeding.

## Tone and setting

This is a Cold War spy thriller in the early 1960s. Think le Carré, not Moore-era Bond. The register is understated, unglamorous, dry.

**What this means in practice:**

- Locations are functional and specific: a transit hotel that hasn't been renovated since the war, a port authority building with strip lighting, a military facility with numbered corridors. Not villain lairs, not grand setpieces.
- Enemy names are period-authentic. Soviet bloc: Volkov, Petrov, Zima, Baranov, Kuznetsov, Marta, Irina. Western contacts: Harrison, Crane, Bellamy, Müller, Dupont. Avoid anything that sounds like a movie character.
- The MacGuffin should feel real: a cipher device, a list of names, a film canister, a defector who can walk but not fast. Not a superweapon, not a doomsday device.
- The deadline has a mundane cause: a dinner that ends, a shift change, a flight that departs. Not a countdown to destruction.
- Guards are people. They have surnames on the roster, a patrol that inconveniences them as much as Jacob, a habit (smokes at the east window, checks his watch on the hour). One or two of them should have something in their examine target that makes them briefly human.
- The win condition is quiet. Jacob gets out. The file closes. No explosion, no applause.

**Things to avoid:**
- Exotic locations chosen for glamour rather than function (Monte Carlo, a volcano base)
- Enemies named after their role ("The Commissar", "The Interrogator")
- MacGuffins with global-scale stakes described in breathless terms
- Any room that exists to look impressive rather than to be used

## Skeleton quality checks

Before presenting the skeleton, verify it against the playbook checklist:
- Seven phases distinct in feel
- Act 2 has at least one branch; Act 3 has at least two
- At least one PATROL WINDOW and one CHOKEPOINT GUARD across the field acts
- At least one MULTI-ROUTE UNLOCK in Act 3
- Escape leg has a route closure and a surviving route
- Extraction point is narratively motivated
- No anti-patterns (dead end key, sequential locks, alarm as game-over, orphaned rooms)

## Output format

Follow mission-template.md sections 1–4 exactly. Use the same heading structure. Write area plans in the code-block format from section 4. Include a rough ASCII map in section 3.

End with a one-paragraph note on any design choices that deviate from the playbook defaults, or tradeoffs you made in the structure.

After presenting the skeleton, ask: **"Approve to proceed to room detail and JSON, or any changes first?"**
