import type { GameData } from '../types/data'
import type { GameState } from '../types/state'
import type { SubSystemResult } from '../types/engine'
import { ACTION_COSTS } from '../constants'
import { guardPosition } from './patrol'
import { escalateAlarm } from './alarm'

export function handleSearch(state: GameState, data: GameData): SubSystemResult {
  const roomId = state.protagonist.currentRoom
  const room = data.roomIndex[roomId]
  const roomState = state.roomStates[roomId]

  if (!room || !roomState) {
    return { state, messages: ['There is nothing to search here.'] }
  }

  const searchCost = Math.max(1, ACTION_COSTS.search + (room.searchDifficulty ?? 0))

  const interruptingGuards = Object.values(data.enemyData).filter((enemy) => {
    if (!enemy.patrol) return false
    const enemyState = state.enemyStates[enemy.id]
    if (enemyState && enemyState.status !== 'active') return false

    for (let t = state.time.elapsed; t < state.time.elapsed + searchCost; t++) {
      if (guardPosition(enemy.patrol, t) === roomId) return true
    }
    return false
  })

  const messages: string[] = []

  if (roomState.flags['searched']) {
    messages.push('You have already searched this room thoroughly.')
    return { state, messages, timeCost: searchCost }
  }

  const newItems = room.hiddenItemIds.filter((id) => !roomState.itemIds.includes(id))

  if (newItems.length === 0) {
    messages.push('You search the room carefully but find nothing of interest.')
  } else {
    messages.push('You search the room carefully.')
    for (const itemId of newItems) {
      const label = data.itemData[itemId]?.label ?? itemId
      messages.push(`You find ${label}.`)
    }
  }

  const newRoomState = {
    ...roomState,
    itemIds: [...roomState.itemIds, ...newItems],
    flags: { ...roomState.flags, searched: true },
  }

  let alarmLevel = state.alarmLevel

  if (interruptingGuards.length > 0) {
    const names = interruptingGuards
      .map((g) => data.enemyData[g.id]?.name ?? 'a guard')
      .join(', ')
    messages.push(`You are interrupted — ${names} enters the room.`)
    alarmLevel = escalateAlarm(state.alarmLevel)
  }

  return {
    state: {
      ...state,
      alarmLevel,
      roomStates: { ...state.roomStates, [roomId]: newRoomState },
    },
    messages,
    noise: 'silent',
    timeCost: searchCost,
  }
}

