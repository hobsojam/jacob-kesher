import type { EnemyData, EnemyType, GameData } from '../types/data'
import type { GameState } from '../types/state'
import { describeRoom } from '../engine/room'
import { guardPosition } from '../engine/patrol'

const GENERIC_LABEL: Record<EnemyType, string> = {
  guard:    'a guard',
  henchman: 'a henchman',
  villain:  'the villain',
  dog:      'a dog',
  civilian: 'a civilian',
  contact:  'your contact',
}

export function enemyDisplayName(enemy: EnemyData, data: GameData): string {
  if (enemy.known) return enemy.name
  const template = data.enemyTemplates[enemy.templateId]
  return template ? GENERIC_LABEL[template.type] : enemy.name
}

export function currentRoomLines(state: GameState, data: GameData): string[] {
  const roomId = state.protagonist.currentRoom
  const room = data.roomIndex[roomId]
  const roomState = state.roomStates[roomId]

  if (!room || !roomState) return ['???']

  const lines = describeRoom(room, roomState)

  if (roomState.itemIds.length > 0) {
    const labels = roomState.itemIds.map((id) => data.itemData[id]?.label ?? id).join(', ')
    lines.push(`You can see: ${labels}.`)
  }

  for (const enemyId of enemiesInRoom(roomId, state, data)) {
    const enemy = data.enemyData[enemyId]
    const enemyState = state.enemyStates[enemyId]
    if (!enemy) continue
    const suffix = enemyStatusSuffix(enemyState?.status)
    lines.push(`${enemyDisplayName(enemy, data)} is here${suffix}.`)
  }

  return lines
}

function enemyStatusSuffix(status: string | undefined): string {
  if (status === 'unconscious') return ' (unconscious)'
  if (status === 'dead') return ' (dead)'
  return ''
}

export function enemiesInRoom(roomId: string, state: GameState, data: GameData): string[] {
  const stationary = state.roomStates[roomId]?.enemyIds ?? []
  const patrolling = Object.values(data.enemyData)
    .filter((e) => e.patrol && guardPosition(e.patrol, state.time.elapsed) === roomId)
    .map((e) => e.id)
  return [...new Set([...stationary, ...patrolling])]
}
