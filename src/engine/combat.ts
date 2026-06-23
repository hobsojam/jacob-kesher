import type { EnemyTemplate, GameData } from '../types/data'
import type { EnemyState, GameState, Inventory, ItemState, NoiseLevel, Skill } from '../types/state'
import type { SubSystemResult } from '../types/engine'
import { guardPosition } from './patrol'
import { rollD20 } from './dice'
import { initEnemyState } from './room'

type WeaponMode = 'unarmed' | 'melee' | 'ranged'

export function handleAttack(
  enemyId: string,
  state: GameState,
  data: GameData,
  roll = rollD20,
): SubSystemResult {
  const enemy = data.enemyData[enemyId]
  const template = enemy ? data.enemyTemplates[enemy.templateId] : undefined
  const enemyState = state.enemyStates[enemyId]

  if (!enemy || !template) {
    return { state, messages: ['There is no one to attack.'] }
  }

  if (enemyState && enemyState.status !== 'active') {
    return { state, messages: [`${enemy.name} is already down.`] }
  }

  const { mode, itemId } = determineWeapon(
    state.protagonist.inventory,
    state.itemStates,
    data,
  )
  const weaponLabel = itemId ? (data.itemData[itemId]?.label ?? 'weapon') : 'bare hands'

  const rawRoll = roll()
  const jacobAttack = rawRoll + attackStat(mode, state.protagonist.stats, state.protagonist.skills)
  const enemyDefence = 10 + template.stats.agility
  const jacobHit = jacobAttack >= enemyDefence

  const messages: string[] = [
    `You attack ${enemy.name} with your ${weaponLabel}.`,
  ]

  const currentHealth = enemyState?.health ?? template.stats.health
  const damage = itemId ? (data.itemData[itemId]?.damage ?? 1) : 1
  let updatedEnemyState: EnemyState = enemyState ?? initEnemyState(enemy)

  let protagonistHealth = state.protagonist.health
  let enemyStillStanding = true

  if (jacobHit) {
    const newHealth = currentHealth - damage
    messages.push(`Hit! (${jacobAttack} vs defence ${enemyDefence})`)

    if (newHealth <= 0) {
      updatedEnemyState = { ...updatedEnemyState, status: 'dead', health: 0 }
      messages.push(`${enemy.name} goes down.`)
      enemyStillStanding = false
    } else {
      updatedEnemyState = { ...updatedEnemyState, health: newHealth }
      messages.push(`${enemy.name} takes the hit. (${newHealth} health remaining)`)
    }
  } else {
    messages.push(`Miss! (${jacobAttack} vs defence ${enemyDefence})`)
  }

  // Natural 20 with a ranged weapon fires the last round
  let updatedItemStates = state.itemStates
  if (rawRoll === 20 && mode === 'ranged' && itemId) {
    messages.push('The slide locks back — that was your last round.')
    updatedItemStates = {
      ...state.itemStates,
      [itemId]: {
        ...(state.itemStates[itemId] ?? { id: itemId, used: false, broken: false }),
        used: true,
      },
    }
  }

  if (enemyStillStanding) {
    const { hit, attackRoll, defence } = resolveEnemyAttack(template, state.protagonist, roll)
    messages.push(`${enemy.name} retaliates. (${attackRoll} vs defence ${defence})`)
    if (hit) {
      protagonistHealth -= 1
      messages.push(`You are hit! (${protagonistHealth} health remaining)`)
    } else {
      messages.push('Miss!')
    }
  }

  const afterCombat: GameState = {
    ...state,
    protagonist: { ...state.protagonist, health: protagonistHealth },
    enemyStates: { ...state.enemyStates, [enemyId]: updatedEnemyState },
    itemStates: updatedItemStates,
  }

  return {
    state: !enemyStillStanding ? pinEnemyToRoom(enemyId, afterCombat) : afterCombat,
    messages,
    noise: modeToNoise(mode),
  }
}

export function handleStealthTakedown(
  enemyId: string,
  intent: 'neutralise' | 'kill',
  state: GameState,
  data: GameData,
): SubSystemResult {
  const enemy = data.enemyData[enemyId]
  const template = enemy ? data.enemyTemplates[enemy.templateId] : undefined
  const enemyState = state.enemyStates[enemyId]

  if (!enemy || !template) {
    return { state, messages: ['There is no one to take down.'] }
  }

  if (enemyState && enemyState.status !== 'active') {
    return { state, messages: [`${enemy.name} is already down.`] }
  }

  const awareness = enemyState?.awareness ?? 'unaware'
  if (awareness !== 'unaware') {
    return { state, messages: [`${enemy.name} is aware of you — a silent takedown is not possible.`] }
  }

  const base: EnemyState = enemyState ?? initEnemyState(enemy)

  let newEnemyState: EnemyState
  let message: string

  if (intent === 'neutralise') {
    const wakeAfter = template.wakeAfterTurns ?? 10
    newEnemyState = {
      ...base,
      status: 'unconscious',
      unconsciousUntil: state.time.elapsed + wakeAfter,
    }
    message = `You silently neutralise ${enemy.name}.`
  } else {
    newEnemyState = { ...base, status: 'dead' }
    message = `You silently eliminate ${enemy.name}.`
  }

  return {
    state: pinEnemyToRoom(enemyId, {
      ...state,
      enemyStates: { ...state.enemyStates, [enemyId]: newEnemyState },
    }),
    messages: [message],
    noise: 'silent',
  }
}

export function handleFlee(state: GameState, _data: GameData): SubSystemResult {
  const { previousRoomId, currentRoom } = state.protagonist

  if (!previousRoomId) {
    return { state, messages: ["There's nowhere to run."] }
  }

  return {
    state: {
      ...state,
      protagonist: {
        ...state.protagonist,
        currentRoom: previousRoomId,
        previousRoomId: currentRoom,
      },
    },
    messages: ['You flee!'],
    noise: 'quiet',
  }
}

// --- exported helpers ---

function resolveEnemyAttack(
  template: EnemyTemplate,
  protagonist: GameState['protagonist'],
  roll: () => number = rollD20,
): { hit: boolean; attackRoll: number; defence: number } {
  const attackRoll = roll() + template.stats.strength
  const defence = 10 + protagonist.stats.agility + skillLevel(protagonist.skills, 'evasion')
  return { hit: attackRoll >= defence, attackRoll, defence }
}

export function guardAmbush(
  state: GameState,
  data: GameData,
  roll: () => number = rollD20,
): { state: GameState; messages: string[] } {
  const roomId = state.protagonist.currentRoom
  const messages: string[] = []
  let s = state

  for (const enemy of Object.values(data.enemyData)) {
    const es = s.enemyStates[enemy.id]
    if (es && es.status !== 'active') continue
    if ((es?.awareness ?? 'unaware') !== 'alert') continue

    const guardRoom = enemy.patrol ? guardPosition(enemy.patrol, s.time.elapsed) : enemy.roomId
    if (guardRoom !== roomId) continue

    const template = data.enemyTemplates[enemy.templateId]
    if (!template) continue

    messages.push(`${enemy.name} spots you and attacks!`)

    const { hit, attackRoll, defence } = resolveEnemyAttack(template, s.protagonist, roll)
    if (hit) {
      const health = s.protagonist.health - 1
      s = { ...s, protagonist: { ...s.protagonist, health } }
      messages.push(`You are hit! (${health} health remaining)`)
    } else {
      messages.push(`The blow misses. (${attackRoll} vs defence ${defence})`)
    }
  }

  return { state: s, messages }
}

// --- exported helpers ---

export function pinEnemyToRoom(enemyId: string, state: GameState): GameState {
  const roomId = state.protagonist.currentRoom
  const rs = state.roomStates[roomId]
  if (!rs || rs.enemyIds.includes(enemyId)) return state
  return {
    ...state,
    roomStates: {
      ...state.roomStates,
      [roomId]: { ...rs, enemyIds: [...rs.enemyIds, enemyId] },
    },
  }
}

// --- private helpers ---

function determineWeapon(
  inventory: Inventory,
  itemStates: Record<string, ItemState>,
  data: GameData,
): { mode: WeaponMode; itemId?: string } {
  for (const id of inventory.weapons) {
    if (!id) continue
    const s = itemStates[id]
    if (s?.used || s?.broken) continue
    const type = data.itemData[id]?.type
    if (type === 'weapon_ranged') return { mode: 'ranged', itemId: id }
    if (type === 'weapon_melee') return { mode: 'melee', itemId: id }
  }
  return { mode: 'unarmed' }
}

function attackStat(
  mode: WeaponMode,
  stats: GameState['protagonist']['stats'],
  skills: Skill[],
): number {
  if (mode === 'ranged') return stats.agility + skillLevel(skills, 'marksmanship')
  return stats.strength + skillLevel(skills, 'pugilism')
}

function skillLevel(skills: Skill[], id: string): number {
  return skills.find((s) => s.id === id)?.level ?? 0
}

function modeToNoise(mode: WeaponMode): NoiseLevel {
  if (mode === 'ranged') return 'alarming'
  if (mode === 'melee') return 'loud'
  return 'quiet'
}
