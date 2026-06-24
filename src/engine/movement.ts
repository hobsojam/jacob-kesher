import type { GameData } from '../types/data'
import type { GameState, RoomState } from '../types/state'
import type { SubSystemResult } from '../types/engine'
import { FALLBACK_ROOM } from '../constants'
import { initRoomState } from './room'
import { inventoryContains } from './inventory'
import { rollD20 } from './dice'

export function handleMove(
  exitLabel: string,
  state: GameState,
  data: GameData,
  mode?: 'sneak' | 'run',
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

  if (exit.blockedBy) {
    const blockerState = state.enemyStates[exit.blockedBy]
    const isActive = !blockerState || blockerState.status === 'active'
    if (isActive) {
      const name = data.enemyData[exit.blockedBy]?.name ?? 'Someone'
      return { state, messages: [`${name} is blocking the way.`] }
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

  // run is only valid for standard exits; silently fall back for crawl/climb/fall/special
  const exitType = exit.exitType ?? 'standard'
  const effectiveMode = mode === 'run' && exitType !== 'standard' ? undefined : mode

  // Climb: blocking pre-move acrobatics check (skipped when an explicit roll is defined)
  if (exitType === 'climb' && !exit.roll) {
    const acrobatics = state.protagonist.skills.find((s) => s.id === 'acrobatics')?.level ?? 0
    const total = rollD20() + state.protagonist.stats.agility + acrobatics
    if (total < 12) {
      return {
        state,
        messages: ['You lose your grip and drop back down.'],
        noise: 'loud',
      }
    }
  }

  const destination = data.roomIndex[exit.destinationId] ?? FALLBACK_ROOM

  const existingRoomState = state.roomStates[destination.id]
  const destinationRoomState: RoomState = existingRoomState
    ? { ...existingRoomState, visited: true }
    : { ...initRoomState(destination.id, data), visited: true }

  const activatingTimer =
    data.timerStartRoomId !== undefined &&
    state.time.timerActive === false &&
    destination.id === data.timerStartRoomId

  let newState: GameState = {
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
    time: activatingTimer ? { ...state.time, timerActive: true } : state.time,
  }

  const messages: string[] = []

  if (effectiveMode === 'sneak') messages.push('You move in silence.')
  else if (effectiveMode === 'run') messages.push('You break into a run.')

  if (exit.roll) {
    const { stat, skillId, dc, failMessage, failFlag } = exit.roll
    const skillLevel = skillId
      ? (state.protagonist.skills.find((s) => s.id === skillId)?.level ?? 0)
      : 0
    const total = rollD20() + state.protagonist.stats[stat] + skillLevel
    if (total < dc) {
      messages.push(failMessage)
      if (failFlag) {
        newState = { ...newState, flags: { ...newState.flags, [failFlag]: true } }
      }
    }
  }

  // Fall: post-move acrobatics check; failure applies 1 HP (skipped when an explicit roll is defined)
  if (exitType === 'fall' && !exit.roll) {
    const acrobatics = state.protagonist.skills.find((s) => s.id === 'acrobatics')?.level ?? 0
    const total = rollD20() + state.protagonist.stats.agility + acrobatics
    if (total < 10) {
      const health = Math.max(0, newState.protagonist.health - 1)
      newState = { ...newState, protagonist: { ...newState.protagonist, health } }
      messages.push('You land badly and take a knock.')
    }
  }

  return {
    state: newState,
    messages,
    timeCost: effectiveMode === 'sneak' ? 2 : effectiveMode === 'run' ? 0 : undefined,
    moveMode: effectiveMode,
  }
}
