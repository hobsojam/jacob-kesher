import type { GameData } from '../types/data'
import type { GameState } from '../types/state'
import type { SubSystemResult } from '../types/engine'

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

  const inv = state.protagonist.inventory
  const inInventory = [
    ...inv.weapons,
    ...inv.gadgets,
    ...inv.small,
    inv.special,
  ].includes(itemId)
  if (!inInventory) {
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

  if (!itemData.effect) {
    return { state, messages: [`You fiddle with ${itemData.label} but nothing happens.`] }
  }

  const { effect } = itemData
  // Keycards and documents are not consumed on use — they stay in the inventory
  // and can be used again (e.g., to unlock further doors or re-read a file).
  const spendable = itemData.type !== 'keycard' && itemData.type !== 'document'
  const spentItemStates = spendable
    ? { ...state.itemStates, [itemId]: { ...itemState, used: true } }
    : state.itemStates

  if (effect.type === 'heal') {
    return {
      state: {
        ...state,
        protagonist: { ...state.protagonist, health: state.protagonist.health + effect.amount },
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

  return {
    state: {
      ...state,
      flags: { ...state.flags, [effect.flag]: true },
      itemStates: spentItemStates,
    },
    messages: [`You use ${itemData.label}.`],
  }
}
