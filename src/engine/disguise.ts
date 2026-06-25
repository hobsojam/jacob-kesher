import type { GameData } from '../types/data'
import type { GameState } from '../types/state'
import { rollD20 } from './dice'
import { enemyPosition } from './patrol'
import { initEnemyState, enemyLabel, cap } from './room'

export function checkDisguise(
  state: GameState,
  data: GameData,
  roll: () => number = rollD20,
): { state: GameState; messages: string[] } {
  if (!state.flags['wearing_uniform']) return { state, messages: [] }

  const currentRoom = state.protagonist.currentRoom
  const charisma = state.protagonist.stats.charisma
  const disguiseLevel = state.protagonist.skills.find((s) => s.id === 'disguise')?.level ?? 0

  const messages: string[] = []
  let next = state
  let changed = false

  for (const enemy of Object.values(data.enemyData)) {
    const es = next.enemyStates[enemy.id]
    if (es && es.status !== 'active') continue

    const enemyRoom = enemyPosition(enemy, next.time.elapsed, next.flags)
    if (enemyRoom !== currentRoom) continue

    const template = data.enemyTemplates[enemy.templateId]
    if (!template) continue

    if (!template.canBeDisguised) continue

    const dc = 10 + template.stats.intelligence
    const total = roll() + charisma + disguiseLevel

    if (total >= dc) {
      // Guard accepts the uniform — reset awareness so they don't attack
      const currentAwareness = es?.awareness ?? 'unaware'
      if (currentAwareness !== 'unaware') {
        next = {
          ...next,
          enemyStates: {
            ...next.enemyStates,
            [enemy.id]: { ...(es ?? initEnemyState(enemy)), awareness: 'unaware' },
          },
        }
        changed = true
      }
    } else {
      // Guard sees through it — alert, uniform blown
      next = {
        ...next,
        flags: { ...next.flags, wearing_uniform: false },
        enemyStates: {
          ...next.enemyStates,
          [enemy.id]: { ...(es ?? initEnemyState(enemy)), awareness: 'alert' },
        },
      }
      changed = true
      messages.push(`${cap(enemyLabel(enemy, data))} looks at you for a moment too long. Your cover is blown.`)
    }
  }

  return { state: changed ? next : state, messages }
}
