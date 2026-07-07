import type { GameData } from '../types/data'
import type { GameState } from '../types/state'
import { enemyPosition } from './patrol'
import { nextStepToward } from './graph'
import { initEnemyState, enemyLabel, cap } from './room'

const DEFAULT_GIVE_UP_TURNS = 3

// Called whenever Jacob's room changes. Any active, alert, pursuit-capable
// enemy left behind in the room he just vacated starts chasing him from there.
export function startPursuit(
  state: GameState,
  data: GameData,
  fromRoomId: string,
  toRoomId: string,
): { state: GameState; messages: string[] } {
  if (fromRoomId === toRoomId) return { state, messages: [] }

  const messages: string[] = []
  const updatedEnemyStates = { ...state.enemyStates }
  let changed = false

  for (const enemy of Object.values(data.enemyData)) {
    const template = data.enemyTemplates[enemy.templateId]
    if (!template?.canPursue) continue

    const es = state.enemyStates[enemy.id]
    if (es && es.status !== 'active') continue
    if ((es?.awareness ?? 'unaware') !== 'alert') continue
    if (es?.pursuit) continue

    if (enemyPosition(enemy, state.time.elapsed, state.flags, es) !== fromRoomId) continue

    updatedEnemyStates[enemy.id] = {
      ...(es ?? initEnemyState(enemy)),
      pursuit: { roomId: fromRoomId, turnsWithoutContact: 0 },
    }
    changed = true
    messages.push(`${cap(enemyLabel(enemy, data))} gives chase!`)
  }

  return {
    state: changed ? { ...state, enemyStates: updatedEnemyStates } : state,
    messages,
  }
}

// Called once per time-advancing action. Every pursuing enemy takes one step
// toward Jacob's current room. turnsWithoutContact only counts turns where
// that step still doesn't land them in Jacob's room — closing the gap (even
// down to a single-room trail) always counts as contact and resets the clock,
// since a guard moving at the same speed as Jacob can otherwise never lose him
// on a connected map. Give-up therefore mainly fires when nextStepToward can't
// find a route at all (e.g. Jacob used a one-way drop the guard can't mirror).
export function advancePursuit(
  state: GameState,
  data: GameData,
): { state: GameState; messages: string[] } {
  const targetRoom = state.protagonist.currentRoom
  const messages: string[] = []
  const updatedEnemyStates = { ...state.enemyStates }
  let changed = false

  for (const [id, es] of Object.entries(state.enemyStates)) {
    if (!es.pursuit || es.status !== 'active') continue

    const enemy = data.enemyData[id]
    if (!enemy) continue

    if (es.pursuit.roomId === targetRoom) {
      // Already holding Jacob's room and he hasn't moved — contact maintained.
      if (es.pursuit.turnsWithoutContact !== 0) {
        updatedEnemyStates[id] = { ...es, pursuit: { roomId: targetRoom, turnsWithoutContact: 0 } }
        changed = true
      }
      continue
    }

    const next = nextStepToward(es.pursuit.roomId, targetRoom, data.roomIndex)

    if (!next) {
      updatedEnemyStates[id] = { ...es, awareness: 'suspicious', pursuit: undefined }
      changed = true
      messages.push(`${cap(enemyLabel(enemy, data))} loses your trail.`)
      continue
    }

    if (next === targetRoom) {
      // Closed the gap this turn — contact regained.
      updatedEnemyStates[id] = { ...es, pursuit: { roomId: next, turnsWithoutContact: 0 } }
      changed = true
      messages.push(`${cap(enemyLabel(enemy, data))} is right behind you!`)
      continue
    }

    const template = data.enemyTemplates[enemy.templateId]
    const giveUpTurns = template?.pursuitGiveUpTurns ?? DEFAULT_GIVE_UP_TURNS
    const turnsWithoutContact = es.pursuit.turnsWithoutContact + 1

    if (turnsWithoutContact >= giveUpTurns) {
      updatedEnemyStates[id] = { ...es, awareness: 'suspicious', pursuit: undefined }
      changed = true
      messages.push(`${cap(enemyLabel(enemy, data))} loses your trail.`)
      continue
    }

    updatedEnemyStates[id] = { ...es, pursuit: { roomId: next, turnsWithoutContact } }
    changed = true
  }

  return {
    state: changed ? { ...state, enemyStates: updatedEnemyStates } : state,
    messages,
  }
}
