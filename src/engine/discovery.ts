import type { GameData } from '../types/data'
import type { GameState } from '../types/state'
import { initEnemyState, enemyLabel, cap } from './room'
import { guardPosition } from './patrol'

export function checkDiscoveries(
  state: GameState,
  data: GameData,
  roll: () => number = Math.random,
): { state: GameState; messages: string[] } {
  if (state.flags['alarm_raised']) return { state, messages: [] }

  // Only bodies that share a room with an active guard can be found this turn
  const activeGuardRooms = new Set<string>()
  for (const enemy of Object.values(data.enemyData)) {
    const es = state.enemyStates[enemy.id]
    if (es && es.status !== 'active') continue
    const room = enemy.patrol ? guardPosition(enemy.patrol, state.time.elapsed) : enemy.roomId
    activeGuardRooms.add(room)
  }

  const found: string[] = []

  for (const [id, enemyState] of Object.entries(state.enemyStates)) {
    if (enemyState.status !== 'unconscious' && enemyState.status !== 'dead') continue

    const enemyData = data.enemyData[id]
    if (!enemyData) continue

    const template = data.enemyTemplates[enemyData.templateId]
    if (!template?.discoveryRisk) continue

    const bodyRoom = enemyState.bodyRoomId ?? enemyData.roomId
    if (!activeGuardRooms.has(bodyRoom)) continue

    if (roll() < template.discoveryRisk) {
      found.push(cap(enemyLabel(enemyData, data)))
    }
  }

  if (found.length === 0) return { state, messages: [] }

  const updatedEnemyStates = { ...state.enemyStates }
  for (const enemy of Object.values(data.enemyData)) {
    const es = updatedEnemyStates[enemy.id]
    if (es && es.status !== 'active') continue
    updatedEnemyStates[enemy.id] = {
      ...(es ?? initEnemyState(enemy)),
      awareness: 'alert',
    }
  }

  const list =
    found.length === 1
      ? found[0]
      : `${found.slice(0, -1).join(', ')} and ${found[found.length - 1]}`
  const verb = found.length === 1 ? 'has' : 'have'
  const messages = [`${list} ${verb} been found. The alarm is raised!`]

  return {
    state: {
      ...state,
      enemyStates: updatedEnemyStates,
      flags: { ...state.flags, alarm_raised: true },
    },
    messages,
  }
}
