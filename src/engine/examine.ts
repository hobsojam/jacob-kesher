import type { GameData } from '../types/data'
import type { GameState } from '../types/state'
import type { SubSystemResult } from '../types/engine'

export function handleExamine(
  targetId: string,
  state: GameState,
  data: GameData,
): SubSystemResult {
  const room = data.roomIndex[state.protagonist.currentRoom]
  if (!room) {
    return { state, messages: ['There is nothing to examine here.'] }
  }
  const target = room.examineTargets.find((t) => t.id === targetId)
  if (!target) {
    return { state, messages: ["You don't see that here."] }
  }
  return { state, messages: [target.description] }
}
