import type { GameData } from '../types/data'
import type { GameState } from '../types/state'

export function checkDiscoveries(
  state: GameState,
  data: GameData,
  roll: () => number = Math.random,
): { state: GameState; messages: string[] } {
  const found: string[] = []

  for (const [id, enemyState] of Object.entries(state.enemyStates)) {
    if (enemyState.status !== 'unconscious' && enemyState.status !== 'dead') continue

    const enemyData = data.enemyData[id]
    if (!enemyData) continue

    const template = data.enemyTemplates[enemyData.templateId]
    if (!template?.discoveryRisk) continue

    if (roll() < template.discoveryRisk) {
      found.push(enemyData.name)
    }
  }

  if (found.length === 0) return { state, messages: [] }

  const updatedEnemyStates = { ...state.enemyStates }
  for (const enemy of Object.values(data.enemyData)) {
    const es = updatedEnemyStates[enemy.id]
    if (es && es.status !== 'active') continue
    updatedEnemyStates[enemy.id] = {
      ...(es ?? { id: enemy.id, status: 'active', inventory: [...enemy.inventory] }),
      awareness: 'alert',
    }
  }

  const list =
    found.length === 1
      ? found[0]
      : `${found.slice(0, -1).join(', ')} and ${found[found.length - 1]}`
  const verb = found.length === 1 ? 'has' : 'have'
  const messages = [`${list} ${verb} been found. The alarm is raised!`]

  return {
    state: {
      ...state,
      enemyStates: updatedEnemyStates,
      flags: { ...state.flags, alarm_raised: true },
    },
    messages,
  }
}
