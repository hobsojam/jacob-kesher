import type { GameData, ItemType } from '../types/data'
import type { GameState, Inventory } from '../types/state'
import type { SubSystemResult } from '../types/engine'

export function handleTake(
  itemId: string,
  state: GameState,
  data: GameData,
): SubSystemResult {
  const roomState = state.roomStates[state.protagonist.currentRoom]

  if (!roomState?.itemIds.includes(itemId)) {
    return { state, messages: ['That item is not here.'] }
  }

  const itemData = data.itemData[itemId]
  if (!itemData) {
    return { state, messages: ['You cannot pick that up.'] }
  }

  const newInventory = addToInventory(state.protagonist.inventory, itemId, itemData.type)
  if (!newInventory) {
    return { state, messages: [`Your ${slotCategory(itemData.type)} are full.`] }
  }

  const newItemStates = state.itemStates[itemId]
    ? state.itemStates
    : { ...state.itemStates, [itemId]: { id: itemId, used: false, broken: false } }

  return {
    state: {
      ...state,
      protagonist: { ...state.protagonist, inventory: newInventory },
      roomStates: {
        ...state.roomStates,
        [state.protagonist.currentRoom]: {
          ...roomState,
          itemIds: roomState.itemIds.filter((id) => id !== itemId),
        },
      },
      itemStates: newItemStates,
    },
    messages: [`You pick up the ${itemData.label}.`],
  }
}

export function handleDrop(
  itemId: string,
  state: GameState,
  data: GameData,
): SubSystemResult {
  const newInventory = removeFromInventory(state.protagonist.inventory, itemId)

  if (!newInventory) {
    return { state, messages: ["You're not carrying that."] }
  }

  const label = data.itemData[itemId]?.label ?? itemId
  const roomId = state.protagonist.currentRoom
  const roomState = state.roomStates[roomId]

  if (!roomState) {
    return { state, messages: ['You cannot drop items here.'] }
  }

  return {
    state: {
      ...state,
      protagonist: { ...state.protagonist, inventory: newInventory },
      roomStates: {
        ...state.roomStates,
        [roomId]: { ...roomState, itemIds: [...roomState.itemIds, itemId] },
      },
    },
    messages: [`You drop the ${label}.`],
  }
}

export function handleLoot(
  enemyId: string,
  itemId: string,
  state: GameState,
  data: GameData,
): SubSystemResult {
  const enemyState = state.enemyStates[enemyId]

  if (!enemyState || enemyState.status === 'active') {
    return { state, messages: ["You can't loot someone who's still standing."] }
  }

  if (!enemyState.inventory.includes(itemId)) {
    return { state, messages: ['That item is not on them.'] }
  }

  const itemData = data.itemData[itemId]
  if (!itemData) {
    return { state, messages: ['You cannot pick that up.'] }
  }

  const newInventory = addToInventory(state.protagonist.inventory, itemId, itemData.type)
  if (!newInventory) {
    return { state, messages: [`Your ${slotCategory(itemData.type)} are full.`] }
  }

  const enemyName = data.enemyData[enemyId]?.name ?? 'them'

  const newItemStates = state.itemStates[itemId]
    ? state.itemStates
    : { ...state.itemStates, [itemId]: { id: itemId, used: false, broken: false } }

  return {
    state: {
      ...state,
      protagonist: { ...state.protagonist, inventory: newInventory },
      enemyStates: {
        ...state.enemyStates,
        [enemyId]: {
          ...enemyState,
          inventory: enemyState.inventory.filter((id) => id !== itemId),
        },
      },
      itemStates: newItemStates,
    },
    messages: [`You take the ${itemData.label} from ${enemyName}.`],
  }
}

// --- exports ---

export function inventoryContains(inventory: Inventory, itemId: string): boolean {
  return (
    inventory.weapons.includes(itemId) ||
    inventory.gadgets.includes(itemId) ||
    inventory.small.includes(itemId) ||
    inventory.special === itemId
  )
}

// --- helpers ---

function slotCategory(type: ItemType): 'weapons' | 'gadgets' | 'small' {
  if (type === 'weapon_melee' || type === 'weapon_ranged') return 'weapons'
  if (type === 'gadget') return 'gadgets'
  return 'small'
}

function addToInventory(
  inventory: Inventory,
  itemId: string,
  type: ItemType,
): Inventory | null {
  const category = slotCategory(type)

  if (category === 'weapons') {
    const i = inventory.weapons.indexOf(null)
    if (i === -1) return null
    const weapons = [...inventory.weapons] as [string | null, string | null]
    weapons[i] = itemId
    return { ...inventory, weapons }
  }

  if (category === 'gadgets') {
    const i = inventory.gadgets.indexOf(null)
    if (i === -1) return null
    const gadgets = [...inventory.gadgets] as [string | null, string | null]
    gadgets[i] = itemId
    return { ...inventory, gadgets }
  }

  const i = inventory.small.indexOf(null)
  if (i === -1) return null
  const small = [...inventory.small] as [string | null, string | null, string | null]
  small[i] = itemId
  return { ...inventory, small }
}

function removeFromInventory(inventory: Inventory, itemId: string): Inventory | null {
  const wi = inventory.weapons.indexOf(itemId)
  if (wi !== -1) {
    const weapons = [...inventory.weapons] as [string | null, string | null]
    weapons[wi] = null
    return { ...inventory, weapons }
  }

  const gi = inventory.gadgets.indexOf(itemId)
  if (gi !== -1) {
    const gadgets = [...inventory.gadgets] as [string | null, string | null]
    gadgets[gi] = null
    return { ...inventory, gadgets }
  }

  const si = inventory.small.indexOf(itemId)
  if (si !== -1) {
    const small = [...inventory.small] as [string | null, string | null, string | null]
    small[si] = null
    return { ...inventory, small }
  }

  if (inventory.special === itemId) {
    return { ...inventory, special: null }
  }

  return null
}
