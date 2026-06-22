import type { GameData } from '../types/data'
import type { GameState } from '../types/state'
import type { Action } from '../types/actions'
import { guardPosition } from '../engine/patrol'

export interface ActionButton {
  label: string
  action: Action
  category: 'move' | 'take' | 'examine' | 'combat' | 'loot' | 'inventory' | 'misc'
  disabled?: boolean
  disabledReason?: string
}

export function computeActions(state: GameState, data: GameData): ActionButton[] {
  const buttons: ActionButton[] = []
  const { currentRoom, previousRoomId, inventory } = state.protagonist
  const room = data.roomIndex[currentRoom]
  const roomState = state.roomStates[currentRoom]

  if (!room || !roomState) return buttons

  // Movement
  for (const exit of room.exits) {
    if (exit.hidden) {
      const flag = `exit_visible_${exit.destinationId}`
      if (!roomState.flags[flag]) continue
    }

    const btn: ActionButton = {
      label: exit.label,
      action: { type: 'move', exitLabel: exit.label },
      category: 'move',
    }

    if (exit.requires) {
      const { itemId, skillId, skillLevel, flag } = exit.requires
      if (itemId && !inventoryHas(inventory, itemId)) {
        btn.disabled = true
        btn.disabledReason = `Requires ${data.itemData[itemId]?.label ?? itemId}`
      } else if (skillId && skillLevel !== undefined) {
        const skill = state.protagonist.skills.find((s) => s.id === skillId)
        if (!skill || skill.level < skillLevel) {
          btn.disabled = true
          btn.disabledReason = `Requires ${skillId} level ${skillLevel}`
        }
      } else if (flag && !state.flags[flag]) {
        btn.disabled = true
        btn.disabledReason = 'Not yet available'
      }
    }

    buttons.push(btn)
  }

  // Items in room
  for (const itemId of roomState.itemIds) {
    const item = data.itemData[itemId]
    if (!item) continue
    buttons.push({ label: `Take ${item.label}`, action: { type: 'take', itemId }, category: 'take' })
  }

  // Examine targets
  for (const target of room.examineTargets) {
    buttons.push({
      label: `Examine ${target.label}`,
      action: { type: 'examine', targetId: target.id },
      category: 'examine',
    })
  }

  // Enemies
  for (const enemyId of enemiesInRoom(currentRoom, state, data)) {
    const enemy = data.enemyData[enemyId]
    const enemyState = state.enemyStates[enemyId]
    if (!enemy) continue

    if (!enemyState || enemyState.status === 'active') {
      buttons.push({ label: `Attack ${enemy.name}`, action: { type: 'attack', enemyId }, category: 'combat' })
      buttons.push({ label: `Take down ${enemy.name}`, action: { type: 'stealth_takedown', enemyId, intent: 'neutralise' }, category: 'combat' })
      buttons.push({ label: `Eliminate ${enemy.name}`, action: { type: 'stealth_takedown', enemyId, intent: 'kill' }, category: 'combat' })
    } else {
      for (const itemId of enemyState.inventory) {
        const item = data.itemData[itemId]
        if (!item) continue
        buttons.push({ label: `Loot ${item.label} from ${enemy.name}`, action: { type: 'loot', enemyId, itemId }, category: 'loot' })
      }
    }
  }

  // Inventory
  for (const itemId of carriedItems(inventory)) {
    const item = data.itemData[itemId]
    if (!item) continue
    buttons.push({ label: `Use ${item.label}`, action: { type: 'use', itemId }, category: 'inventory' })
    buttons.push({ label: `Drop ${item.label}`, action: { type: 'drop', itemId }, category: 'inventory' })
  }

  // Always available
  buttons.push({ label: 'Search room', action: { type: 'search' }, category: 'misc' })
  buttons.push({ label: 'Look around', action: { type: 'look' }, category: 'misc' })
  if (previousRoomId) {
    buttons.push({ label: 'Flee!', action: { type: 'flee' }, category: 'misc' })
  }

  return buttons
}

function inventoryHas(inventory: GameState['protagonist']['inventory'], itemId: string): boolean {
  return [...inventory.weapons, ...inventory.gadgets, ...inventory.small, inventory.special].includes(itemId)
}

function carriedItems(inventory: GameState['protagonist']['inventory']): string[] {
  return [...inventory.weapons, ...inventory.gadgets, ...inventory.small, inventory.special]
    .filter((id): id is string => id !== null)
}

function enemiesInRoom(roomId: string, state: GameState, data: GameData): string[] {
  const stationary = state.roomStates[roomId]?.enemyIds ?? []
  const patrolling = Object.values(data.enemyData)
    .filter((e) => e.patrol && guardPosition(e.patrol, state.time.elapsed) === roomId)
    .map((e) => e.id)
  return [...new Set([...stationary, ...patrolling])]
}
