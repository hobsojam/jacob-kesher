import type { Exit, GameData, RoomData } from '../types/data'
import type { GameState, RoomState } from '../types/state'
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
  const { currentRoom, previousRoomId } = state.protagonist
  const room = data.roomIndex[currentRoom]
  const roomState = state.roomStates[currentRoom]

  if (!room || !roomState) return []

  return [
    ...moveButtons(room, roomState, state, data),
    ...takeButtons(roomState, data),
    ...examineButtons(room),
    ...enemyButtons(currentRoom, state, data),
    ...inventoryButtons(state, data),
    ...miscButtons(previousRoomId),
  ]
}

function moveButtons(
  room: RoomData,
  roomState: RoomState,
  state: GameState,
  data: GameData,
): ActionButton[] {
  return room.exits
    .filter((exit) => !exit.hidden || !!roomState.flags[`exit_visible_${exit.destinationId}`])
    .map((exit) => {
      const btn: ActionButton = {
        label: exit.label,
        action: { type: 'move', exitLabel: exit.label },
        category: 'move',
      }
      if (exit.requires) applyRequirement(btn, exit.requires, state, data)
      return btn
    })
}

function applyRequirement(
  btn: ActionButton,
  req: NonNullable<Exit['requires']>,
  state: GameState,
  data: GameData,
): void {
  if (req.itemId && !inventoryHas(state.protagonist.inventory, req.itemId)) {
    btn.disabled = true
    btn.disabledReason = `Requires ${data.itemData[req.itemId]?.label ?? req.itemId}`
  } else if (req.skillId && req.skillLevel !== undefined) {
    const skill = state.protagonist.skills.find((s) => s.id === req.skillId)
    if (!skill || skill.level < req.skillLevel) {
      btn.disabled = true
      btn.disabledReason = `Requires ${req.skillId} level ${req.skillLevel}`
    }
  } else if (req.flag && !state.flags[req.flag]) {
    btn.disabled = true
    btn.disabledReason = 'Not yet available'
  }
}

function takeButtons(roomState: RoomState, data: GameData): ActionButton[] {
  return roomState.itemIds.flatMap((itemId) => {
    const item = data.itemData[itemId]
    if (!item) return []
    return [{ label: `Take ${item.label}`, action: { type: 'take' as const, itemId }, category: 'take' as const }]
  })
}

function examineButtons(room: RoomData): ActionButton[] {
  return room.examineTargets.map((target) => ({
    label: `Examine ${target.label}`,
    action: { type: 'examine' as const, targetId: target.id },
    category: 'examine' as const,
  }))
}

function enemyButtons(roomId: string, state: GameState, data: GameData): ActionButton[] {
  const buttons: ActionButton[] = []
  for (const enemyId of enemiesInRoom(roomId, state, data)) {
    const enemy = data.enemyData[enemyId]
    const enemyState = state.enemyStates[enemyId]
    if (!enemy) continue

    if (!enemyState || enemyState.status === 'active') {
      buttons.push(
        { label: `Attack ${enemy.name}`, action: { type: 'attack', enemyId }, category: 'combat' },
        { label: `Take down ${enemy.name}`, action: { type: 'stealth_takedown', enemyId, intent: 'neutralise' }, category: 'combat' },
        { label: `Eliminate ${enemy.name}`, action: { type: 'stealth_takedown', enemyId, intent: 'kill' }, category: 'combat' },
      )
    } else {
      buttons.push(...lootButtons(enemyId, enemy.name, enemyState.inventory, data))
    }
  }
  return buttons
}

function lootButtons(
  enemyId: string,
  enemyName: string,
  inventory: string[],
  data: GameData,
): ActionButton[] {
  return inventory.flatMap((itemId) => {
    const item = data.itemData[itemId]
    if (!item) return []
    return [{ label: `Loot ${item.label} from ${enemyName}`, action: { type: 'loot' as const, enemyId, itemId }, category: 'loot' as const }]
  })
}

function inventoryButtons(state: GameState, data: GameData): ActionButton[] {
  return carriedItems(state.protagonist.inventory).flatMap((itemId) => {
    const item = data.itemData[itemId]
    if (!item) return []
    return [
      { label: `Use ${item.label}`, action: { type: 'use' as const, itemId }, category: 'inventory' as const },
      { label: `Drop ${item.label}`, action: { type: 'drop' as const, itemId }, category: 'inventory' as const },
    ]
  })
}

function miscButtons(previousRoomId: string | null): ActionButton[] {
  const buttons: ActionButton[] = [
    { label: 'Search room', action: { type: 'search' }, category: 'misc' },
    { label: 'Look around', action: { type: 'look' }, category: 'misc' },
  ]
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
