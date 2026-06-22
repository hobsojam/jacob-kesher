import type { GameData } from '../types/data'
import type { GameState } from '../types/state'

export function checkReveals(state: GameState, data: GameData): GameState {
  let nextRoomStates = state.roomStates
  let changed = false

  for (const [roomId, room] of Object.entries(data.roomIndex)) {
    if (!room.reveals || room.reveals.length === 0) continue
    const roomState = nextRoomStates[roomId]
    if (!roomState) continue

    const toReveal = room.reveals.filter(
      (r) => roomState.flags[r.flag] && !roomState.itemIds.includes(r.itemId),
    )
    if (toReveal.length === 0) continue

    nextRoomStates = {
      ...nextRoomStates,
      [roomId]: {
        ...roomState,
        itemIds: [...roomState.itemIds, ...toReveal.map((r) => r.itemId)],
      },
    }
    changed = true
  }

  return changed ? { ...state, roomStates: nextRoomStates } : state
}
