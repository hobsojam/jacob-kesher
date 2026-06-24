import type { Exit, ExitType, GameData, RoomData } from '../types/data'
import type { GameState, RoomState } from '../types/state'
import type { Action } from '../types/actions'
import { enemyDisplayName, enemiesInRoom } from './room'
import { inventoryContains } from '../engine/inventory'
import { SKILLS } from '../constants'

export interface ActionButton {
  label: string
  shortLabel?: string   // abbreviated label for use inside accordion bodies
  action: Action
  category: 'move' | 'take' | 'examine' | 'combat' | 'loot' | 'inventory' | 'misc'
  disabled?: boolean
  disabledReason?: string
  groupId?: string       // shared ID for accordion grouping
  groupLabel?: string    // accordion header text for non-enemy groups (e.g. exit label)
}

export function computeActions(state: GameState, data: GameData): ActionButton[] {
  const { currentRoom, previousRoomId } = state.protagonist
  const room = data.roomIndex[currentRoom]
  const roomState = state.roomStates[currentRoom]

  if (!room || !roomState) return []

  const activeEnemyPresent = enemiesInRoom(currentRoom, state, data).some((id) => {
    const es = state.enemyStates[id]
    return !es || es.status === 'active'
  })

  return [
    ...moveButtons(room, roomState, state, data),
    ...takeButtons(roomState, data),
    ...examineButtons(room),
    ...interactButtons(room, state),
    ...enemyButtons(currentRoom, state, data),
    ...miscButtons(previousRoomId, activeEnemyPresent),
  ]
}

function moveButtons(
  room: RoomData,
  roomState: RoomState,
  state: GameState,
  data: GameData,
): ActionButton[] {
  const inMission = state.time.timerActive !== false
  const visibleExits = room.exits.filter(
    (exit) => !exit.hidden || !!roomState.flags[`exit_visible_${exit.destinationId}`],
  )

  if (!inMission) {
    // Pre-mission transitions: single ungrouped button per exit (no mode choice)
    return visibleExits.map((exit) => {
      const btn: ActionButton = { label: exit.label, action: { type: 'move', exitLabel: exit.label }, category: 'move' }
      if (exit.requires) applyRequirement(btn, exit.requires, state, data)
      return btn
    })
  }

  // In-mission: per-exit accordion groups with mode buttons based on exit type
  return visibleExits.flatMap((exit) => exitModeButtons(exit, state, data))
}

function exitModeButtons(exit: Exit, state: GameState, data: GameData): ActionButton[] {
  const groupId = `exit_${exit.destinationId}`
  const groupLabel = exit.label
  const type: ExitType = exit.exitType ?? 'standard'

  const req = exit.requires ? reqDisabled(exit, state, data) : {}
  const base = { category: 'move' as const, groupId, groupLabel, ...req }

  switch (type) {
    case 'crawl':
      return [
        { ...base, label: 'Crawl quietly', action: { type: 'move', exitLabel: exit.label, mode: 'sneak' as const } },
        { ...base, label: 'Crawl',         action: { type: 'move', exitLabel: exit.label } },
      ]
    case 'climb':
      return [
        { ...base, label: 'Climb carefully', action: { type: 'move', exitLabel: exit.label, mode: 'sneak' as const } },
        { ...base, label: 'Climb',           action: { type: 'move', exitLabel: exit.label } },
      ]
    case 'fall':
    case 'special':
      return [
        { ...base, label: exit.label, action: { type: 'move', exitLabel: exit.label } },
      ]
    default: // standard
      return [
        { ...base, label: 'Sneak', action: { type: 'move', exitLabel: exit.label, mode: 'sneak' as const } },
        { ...base, label: 'Move',  action: { type: 'move', exitLabel: exit.label } },
        { ...base, label: 'Run',   action: { type: 'move', exitLabel: exit.label, mode: 'run' as const } },
      ]
  }
}

function reqDisabled(exit: Exit, state: GameState, data: GameData): { disabled?: boolean; disabledReason?: string } {
  const tmp: ActionButton = { label: '', action: { type: 'move', exitLabel: '' }, category: 'move' }
  applyRequirement(tmp, exit.requires!, state, data)
  return { disabled: tmp.disabled, disabledReason: tmp.disabledReason }
}

function applyRequirement(
  btn: ActionButton,
  req: NonNullable<Exit['requires']>,
  state: GameState,
  data: GameData,
): void {
  if (req.itemId && !inventoryContains(state.protagonist.inventory, req.itemId)) {
    btn.disabled = true
    btn.disabledReason = `Requires ${data.itemData[req.itemId]?.label ?? req.itemId}`
  } else if (req.skillId && req.skillLevel !== undefined) {
    const skill = state.protagonist.skills.find((s) => s.id === req.skillId)
    if (!skill || skill.level < req.skillLevel) {
      const skillLabel = SKILLS.find((s) => s.id === req.skillId)?.label ?? req.skillId
      btn.disabled = true
      btn.disabledReason = `Requires ${skillLabel} level ${req.skillLevel}`
    }
  } else if (req.flag && !state.flags[req.flag] && !state.roomStates[state.protagonist.currentRoom]?.flags[req.flag]) {
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

function interactButtons(room: RoomData, state: GameState): ActionButton[] {
  return room.examineTargets.flatMap((target) => {
    if (!target.effect || target.effect.length === 0) return []
    const alreadyDone = target.effect.some((e) => {
      if (e.type === 'set_global_flag') return !!state.flags[e.flag]
      if (e.type === 'set_room_flag') return !!state.roomStates[state.protagonist.currentRoom]?.flags[e.flag]
      return false
    })
    if (alreadyDone) return []
    const label = target.interactLabel ?? `Interact with ${target.label}`
    return [{ label, action: { type: 'interact' as const, targetId: target.id }, category: 'examine' as const }]
  })
}

function enemyButtons(roomId: string, state: GameState, data: GameData): ActionButton[] {
  const buttons: ActionButton[] = []
  for (const enemyId of enemiesInRoom(roomId, state, data)) {
    const enemy = data.enemyData[enemyId]
    const enemyState = state.enemyStates[enemyId]
    if (!enemy) continue

    const displayName = enemyDisplayName(enemy, data)
    const template = data.enemyTemplates[enemy.templateId]
    if (!enemyState || enemyState.status === 'active') {
      const awareness = enemyState?.awareness ?? 'unaware'
      const canTakedown = awareness === 'unaware'
      buttons.push(
        { label: `Attack ${displayName}`, shortLabel: 'Attack', action: { type: 'attack', enemyId }, category: 'combat', groupId: enemyId },
        {
          label: `Knock out ${displayName}`,
          shortLabel: 'Knock out',
          action: { type: 'stealth_takedown', enemyId, intent: 'neutralise' },
          category: 'combat',
          groupId: enemyId,
          disabled: !canTakedown,
          disabledReason: canTakedown ? undefined : 'Guard is aware of you',
        },
        {
          label: `Kill ${displayName} (silent)`,
          shortLabel: 'Kill silently',
          action: { type: 'stealth_takedown', enemyId, intent: 'kill' },
          category: 'combat',
          groupId: enemyId,
          disabled: !canTakedown,
          disabledReason: canTakedown ? undefined : 'Guard is aware of you',
        },
      )
      if (template?.canBeBluffed) {
        buttons.push({ label: `Talk to ${displayName}`, shortLabel: 'Talk', action: { type: 'talk', enemyId }, category: 'misc', groupId: enemyId })
      }
    } else {
      buttons.push(...lootButtons(enemyId, displayName, enemyState.inventory, data))
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
    return [{
      label: `Loot ${item.label} from ${enemyName}`,
      shortLabel: item.label,
      action: { type: 'loot' as const, enemyId, itemId },
      category: 'loot' as const,
      groupId: enemyId,
    }]
  })
}

function miscButtons(previousRoomId: string | null, activeEnemyPresent: boolean): ActionButton[] {
  const buttons: ActionButton[] = [
    { label: 'Search area', action: { type: 'search' }, category: 'misc' },
    { label: 'Look around', action: { type: 'look' }, category: 'misc' },
  ]
  if (activeEnemyPresent && previousRoomId) {
    buttons.push({ label: 'Flee!', action: { type: 'flee' }, category: 'misc' })
  }
  return buttons
}

