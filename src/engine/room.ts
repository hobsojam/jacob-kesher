import type { EnemyData, EnemyType, RoomData } from '../types/data'
import type { GameData } from '../types/data'
import type { EnemyState, RoomState } from '../types/state'

const GENERIC_LABEL: Record<EnemyType, string> = {
  guard:    'a guard',
  henchman: 'a henchman',
  villain:  'the villain',
  dog:      'a dog',
  civilian: 'a civilian',
  contact:  'your contact',
}

/** Returns the enemy's display name respecting the `known` flag.
 *  Use `cap(enemyLabel(...))` when the name opens a sentence. */
export function enemyLabel(enemy: EnemyData, data: GameData): string {
  if (enemy.known) return enemy.name
  const template = data.enemyTemplates[enemy.templateId]
  return template ? GENERIC_LABEL[template.type] : enemy.name
}

export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function describeRoom(room: RoomData, roomState: RoomState): string[] {
  const lines: string[] = [room.label, room.description]
  for (const addendum of room.addenda) {
    if (roomState.flags[addendum.flag]) {
      lines.push(addendum.text)
    }
  }
  return lines
}

export function initEnemyState(enemy: EnemyData): EnemyState {
  return { id: enemy.id, status: 'active', inventory: [...enemy.inventory] }
}

export function initRoomState(roomId: string, data: GameData): RoomState {
  const room = data.roomIndex[roomId]
  const stationaryEnemyIds = Object.values(data.enemyData)
    .filter((e) => e.roomId === roomId && !e.patrol)
    .map((e) => e.id)

  return {
    id: roomId,
    itemIds: room ? [...room.itemIds] : [],
    enemyIds: stationaryEnemyIds,
    flags: {},
    visited: false,
  }
}
