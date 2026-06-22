import type { GameData } from '../types/data'
import type { GameState, EnemyState } from '../types/state'
import type { SubSystemResult } from '../types/engine'
import { rollD20 } from './dice'

export function handleTalk(
  enemyId: string,
  state: GameState,
  data: GameData,
  roll = rollD20,
): SubSystemResult {
  const enemy = data.enemyData[enemyId]
  if (!enemy) return { state, messages: ['There is no one there.'] }

  const enemyState = state.enemyStates[enemyId]
  if (enemyState && enemyState.status !== 'active') {
    return { state, messages: ['They are in no state to talk.'] }
  }

  const template = data.enemyTemplates[enemy.templateId]
  if (!template) return { state, messages: ['There is no one there.'] }

  if (!template.canBeBluffed) {
    return { state, messages: ['They are not impressed by words.'] }
  }

  const persuasion = state.protagonist.skills.find((sk) => sk.id === 'persuasion')?.level ?? 0
  const rollResult = roll() + state.protagonist.stats.charisma + persuasion
  // Enemies that can see through disguises are harder to bluff
  const resistance = 10 + (template.canBeDisguised ? 0 : 3)

  const base: EnemyState = enemyState ?? { id: enemyId, status: 'active', inventory: [...enemy.inventory] }

  if (rollResult >= resistance) {
    return {
      state: { ...state, enemyStates: { ...state.enemyStates, [enemyId]: { ...base, awareness: 'unaware' } } },
      messages: ['Your cover story holds. They wave you on without a second glance.'],
      noise: 'silent',
    }
  }

  return {
    state: { ...state, enemyStates: { ...state.enemyStates, [enemyId]: { ...base, awareness: 'alert' } } },
    messages: [`${enemy.name} doesn't buy it. They raise the alarm!`],
    noise: 'quiet',
  }
}
