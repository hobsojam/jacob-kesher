import type { RoomData } from '../types/data'
import type { GameData } from '../types/data'
import type { RoomState } from '../types/state'

export function describeRoom(room: RoomData, roomState: RoomState): string[] {
  const lines: string[] = [room.label, room.description]
  for (const addendum of room.addenda) {
    if (roomState.flags[addendum.flag]) {
      lines.push(addendum.text)
    }
  }
  return lines
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
