import type { GameData } from '../types/data'
import type { EnemyState, GameState, ItemState, NoiseLevel, Skill } from '../types/state'
import type { Inventory } from '../types/state'
import type { SubSystemResult } from '../types/engine'

type WeaponMode = 'unarmed' | 'melee' | 'ranged'

const defaultRoll = (): number => Math.floor(Math.random() * 20) + 1

export function handleAttack(
  enemyId: string,
  state: GameState,
  data: GameData,
  roll = defaultRoll,
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

  const jacobAttack =
    roll() + attackStat(mode, state.protagonist.stats, state.protagonist.skills)
  const enemyDefence = 10 + template.stats.agility
  const jacobHit = jacobAttack >= enemyDefence

  const messages: string[] = [
    `You attack ${enemy.name} with your ${weaponLabel}.`,
  ]

  const currentHealth = enemyState?.health ?? template.stats.health
  let updatedEnemyState: EnemyState = enemyState ?? {
    id: enemyId,
    status: 'active',
    inventory: [...enemy.inventory],
  }

  let protagonistHealth = state.protagonist.health
  let enemyStillStanding = true

  if (jacobHit) {
    const newHealth = currentHealth - 1
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

  if (enemyStillStanding) {
    const enemyAttack = roll() + template.stats.strength
    const jacobDefence =
      10 +
      state.protagonist.stats.agility +
      skillLevel(state.protagonist.skills, 'evasion')

    messages.push(`${enemy.name} retaliates. (${enemyAttack} vs defence ${jacobDefence})`)

    if (enemyAttack >= jacobDefence) {
      protagonistHealth -= 1
      messages.push(`You are hit! (${protagonistHealth} health remaining)`)
    } else {
      messages.push('Miss!')
    }
  }

  return {
    state: {
      ...state,
      protagonist: { ...state.protagonist, health: protagonistHealth },
      enemyStates: { ...state.enemyStates, [enemyId]: updatedEnemyState },
    },
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

  const base: EnemyState = enemyState ?? {
    id: enemyId,
    status: 'active',
    inventory: [...enemy.inventory],
  }

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
    state: {
      ...state,
      enemyStates: { ...state.enemyStates, [enemyId]: newEnemyState },
    },
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

// --- helpers ---

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
  return stats.strength + skillLevel(skills, 'hand_to_hand')
}

function skillLevel(skills: Skill[], id: string): number {
  return skills.find((s) => s.id === id)?.level ?? 0
}

function modeToNoise(mode: WeaponMode): NoiseLevel {
  if (mode === 'ranged') return 'alarming'
  if (mode === 'melee') return 'loud'
  return 'quiet'
}
