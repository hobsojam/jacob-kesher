import type { ItemEffect, GameData } from '../types/data'
import type { GameState } from '../types/state'
import type { SubSystemResult } from '../types/engine'
import { SKILLS } from '../constants'
import { inventoryContains } from './inventory'

export function handleInteract(
  targetId: string,
  state: GameState,
  data: GameData,
): SubSystemResult {
  const roomId = state.protagonist.currentRoom
  const room = data.roomIndex[roomId]
  if (!room) return { state, messages: ['There is nothing to interact with here.'] }

  const target = room.examineTargets.find((t) => t.id === targetId)
  if (!target || !target.effect || target.effect.length === 0) {
    return { state, messages: ['Nothing happens.'] }
  }

  if (target.interactRequires) {
    const req = target.interactRequires
    if (req.itemId && !inventoryContains(state.protagonist.inventory, req.itemId)) {
      const label = data.itemData[req.itemId]?.label ?? req.itemId
      return { state, messages: [`You need the ${label.toLowerCase()} to do that.`] }
    }
    if (req.skillId !== undefined) {
      const have = state.protagonist.skills.find((s) => s.id === req.skillId)?.level ?? 0
      const need = req.skillLevel ?? 1
      if (have < need) {
        const skillLabel = SKILLS.find((s) => s.id === req.skillId)?.label ?? req.skillId
        return { state, messages: [`Your ${skillLabel} isn't high enough.`] }
      }
    }
  }

  let next = state
  const messages: string[] = []

  for (const effect of target.effect) {
    const applied = applyEffect(effect, next, messages)
    next = applied
  }

  return { state: next, messages }
}

function applyEffect(effect: ItemEffect, state: GameState, messages: string[]): GameState {
  const roomId = state.protagonist.currentRoom

  if (effect.type === 'heal') {
    const health = Math.min(state.protagonist.health + effect.amount, state.protagonist.maxHealth)
    messages.push(`You recover ${effect.amount} health.`)
    return { ...state, protagonist: { ...state.protagonist, health } }
  }

  if (effect.type === 'set_room_flag') {
    const roomState = state.roomStates[roomId]
    if (!roomState) return state
    return {
      ...state,
      roomStates: {
        ...state.roomStates,
        [roomId]: { ...roomState, flags: { ...roomState.flags, [effect.flag]: true } },
      },
    }
  }

  if (effect.type === 'set_global_flag_if') {
    const flag = state.flags[effect.condition] ? effect.flag : effect.else_flag
    return applyGlobalFlag(flag, state, messages)
  }

  if (effect.type === 'set_global_flag') {
    return applyGlobalFlag(effect.flag, state, messages)
  }

  effect satisfies never
  return state
}

function applyGlobalFlag(flag: string, state: GameState, messages: string[]): GameState {
  if (flag === 'mission_complete') {
    messages.push('Download complete. The files are on your drive.')
  }
  if (flag === 'mission_failed') {
    messages.push('You left without the photographs. Mission failed.')
  }
  return { ...state, flags: { ...state.flags, [flag]: true } }
}
