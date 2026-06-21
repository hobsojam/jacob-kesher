import type { GameData } from '../types/data'
import type { GameState } from '../types/state'
import type { SubSystemResult } from '../types/engine'
import { FALLBACK_ROOM } from '../constants'
import { describeRoom } from './room'

export function handleLook(state: GameState, data: GameData): SubSystemResult {
  const roomId = state.protagonist.currentRoom
  const room = data.roomIndex[roomId] ?? FALLBACK_ROOM
  const roomState = state.roomStates[roomId]
  const messages = roomState
    ? describeRoom(room, roomState)
    : [room.label, room.description]
  return { state, messages }
}
