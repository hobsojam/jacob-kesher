import type { GameData } from '../types/data'
import type { GameState, Inventory, RoomState } from '../types/state'
import type { SubSystemResult } from '../types/engine'
import { FALLBACK_ROOM } from '../constants'
import { initRoomState } from './room'

export function handleMove(
  exitLabel: string,
  state: GameState,
  data: GameData,
): SubSystemResult {
  const currentRoom =
    data.roomIndex[state.protagonist.currentRoom] ?? FALLBACK_ROOM

  const exit = currentRoom.exits.find((e) => e.label === exitLabel)

  if (!exit) {
    return { state, messages: ['There is no exit that way.'] }
  }

  if (exit.hidden) {
    const roomState = state.roomStates[currentRoom.id]
    if (!roomState?.flags[`exit_visible_${exit.destinationId}`]) {
      return { state, messages: ['There is no exit that way.'] }
    }
  }

  if (exit.requires) {
    const { itemId, skillId, skillLevel, flag } = exit.requires

    if (itemId && !inventoryContains(state.protagonist.inventory, itemId)) {
      const label = data.itemData[itemId]?.label ?? itemId
      return { state, messages: [`You need the ${label} to use this exit.`] }
    }

    if (skillId) {
      const skill = state.protagonist.skills.find((s) => s.id === skillId)
      const requiredLevel = skillLevel ?? 1
      if (!skill || skill.level < requiredLevel) {
        const skillLabel = skill?.label ?? skillId
        return { state, messages: [`Your ${skillLabel} isn't high enough (level ${requiredLevel} required).`] }
      }
    }

    if (flag && !state.flags[flag] && !state.roomStates[currentRoom.id]?.flags[flag]) {
      return { state, messages: ["You can't use this exit yet."] }
    }
  }

  const destination = data.roomIndex[exit.destinationId] ?? FALLBACK_ROOM

  const existingRoomState = state.roomStates[destination.id]
  const destinationRoomState: RoomState = existingRoomState
    ? { ...existingRoomState, visited: true }
    : { ...initRoomState(destination.id, data), visited: true }

  const newState: GameState = {
    ...state,
    protagonist: {
      ...state.protagonist,
      previousRoomId: state.protagonist.currentRoom,
      currentRoom: destination.id,
    },
    roomStates: {
      ...state.roomStates,
      [destination.id]: destinationRoomState,
    },
  }

  return {
    state: newState,
    messages: [],
  }
}

function inventoryContains(inventory: Inventory, itemId: string): boolean {
  return (
    inventory.weapons.includes(itemId) ||
    inventory.gadgets.includes(itemId) ||
    inventory.small.includes(itemId) ||
    inventory.special === itemId
  )
}
