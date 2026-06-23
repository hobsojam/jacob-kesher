import type { GameData } from '../types/data'
import type { GameState } from '../types/state'
import type { SubSystemResult } from '../types/engine'
import { inventoryContains } from './inventory'

export function handleUse(
  itemId: string,
  state: GameState,
  data: GameData,
  targetId?: string,
): SubSystemResult {
  const itemData = data.itemData[itemId]
  if (!itemData) {
    return { state, messages: ["You don't have that."] }
  }

  if (!inventoryContains(state.protagonist.inventory, itemId)) {
    return { state, messages: ["You don't have that."] }
  }

  const itemState = state.itemStates[itemId] ?? { id: itemId, used: false, broken: false }
  if (itemState.used) {
    return { state, messages: [`${itemData.label} is already spent.`] }
  }

  // Items with usableOn require a specific target
  if (itemData.usableOn && itemData.usableOn.length > 0) {
    if (!targetId) {
      return { state, messages: [`Use ${itemData.label} on what?`] }
    }
    if (!itemData.usableOn.includes(targetId)) {
      return { state, messages: [`You can't use ${itemData.label} on that.`] }
    }
    const room = data.roomIndex[state.protagonist.currentRoom]
    const targetInRoom = room?.examineTargets.some((t) => t.id === targetId)
    if (!targetInRoom) {
      return { state, messages: ["That isn't here."] }
    }
  }

  // Target-specific effects take priority and never consume the item
  if (targetId && itemData.targetEffects?.[targetId]) {
    const messages: string[] = []
    let next = state
    for (const eff of itemData.targetEffects[targetId]) {
      if (eff.type === 'message') {
        messages.push(eff.text)
      } else if (eff.type === 'set_global_flag') {
        next = { ...next, flags: { ...next.flags, [eff.flag]: true } }
      } else if (eff.type === 'set_room_flag') {
        const rId = next.protagonist.currentRoom
        const rs = next.roomStates[rId]
        if (rs) next = { ...next, roomStates: { ...next.roomStates, [rId]: { ...rs, flags: { ...rs.flags, [eff.flag]: true } } } }
      } else if (eff.type === 'heal') {
        const hp = Math.min(next.protagonist.health + eff.amount, next.protagonist.maxHealth)
        next = { ...next, protagonist: { ...next.protagonist, health: hp } }
        messages.push(`You recover ${eff.amount} health.`)
      }
    }
    return { state: next, messages }
  }

  if (!itemData.effect) {
    return { state, messages: [`You fiddle with ${itemData.label} but nothing happens.`] }
  }

  const { effect } = itemData
  // Only consumable-type items are spent on use; gadgets, weapons, etc. are reusable.
  const spendable = itemData.type === 'consumable'
  const spentItemStates = spendable
    ? { ...state.itemStates, [itemId]: { ...itemState, used: true } }
    : state.itemStates

  if (effect.type === 'heal') {
    const health = Math.min(state.protagonist.health + effect.amount, state.protagonist.maxHealth)
    return {
      state: {
        ...state,
        protagonist: { ...state.protagonist, health },
        itemStates: spentItemStates,
      },
      messages: [`You use ${itemData.label} and recover ${effect.amount} health.`],
    }
  }

  if (effect.type === 'set_room_flag') {
    const roomId = state.protagonist.currentRoom
    const roomState = state.roomStates[roomId]
    if (!roomState) {
      return { state, messages: ["You can't use that here."] }
    }
    return {
      state: {
        ...state,
        roomStates: {
          ...state.roomStates,
          [roomId]: { ...roomState, flags: { ...roomState.flags, [effect.flag]: true } },
        },
        itemStates: spentItemStates,
      },
      messages: [`You use ${itemData.label}.`],
    }
  }

  if (effect.type === 'set_global_flag_if') {
    const flag = state.flags[effect.condition] ? effect.flag : effect.else_flag
    return {
      state: {
        ...state,
        flags: { ...state.flags, [flag]: true },
        itemStates: spentItemStates,
      },
      messages: [`You use ${itemData.label}.`],
    }
  }

  if (effect.type === 'set_global_flag') {
    return {
      state: {
        ...state,
        flags: { ...state.flags, [effect.flag]: true },
        itemStates: spentItemStates,
      },
      messages: [`You use ${itemData.label}.`],
    }
  }

  if (effect.type === 'message') {
    return { state, messages: [effect.text] }
  }

  effect satisfies never
  return { state, messages: [`You fiddle with ${itemData.label} but nothing happens.`] }
}
