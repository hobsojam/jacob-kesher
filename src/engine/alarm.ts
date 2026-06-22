import type { GameData } from '../types/data'
import type { Awareness, EnemyState, GameState, NoiseLevel } from '../types/state'
import { guardPosition } from './patrol'

const ESCALATION_CHANCE: Record<NoiseLevel, { nearby: number; distant: number }> = {
  silent:   { nearby: 0,    distant: 0 },
  quiet:    { nearby: 0.15, distant: 0 },
  loud:     { nearby: 0.4,  distant: 0.1 },
  alarming: { nearby: 0.85, distant: 0.5 },
}

export function escalateAwareness(current: Awareness): Awareness {
  if (current === 'unaware')    return 'suspicious'
  if (current === 'suspicious') return 'alert'
  return 'alert'
}

export function applyNoise(
  noise: NoiseLevel,
  sourceRoomId: string,
  state: GameState,
  data: GameData,
): GameState['enemyStates'] {
  const chances = ESCALATION_CHANCE[noise]
  if (chances.nearby === 0 && chances.distant === 0) return state.enemyStates

  const updated: Record<string, EnemyState> = { ...state.enemyStates }
  let changed = false

  for (const enemy of Object.values(data.enemyData)) {
    const es = state.enemyStates[enemy.id]
    if (es && es.status !== 'active') continue

    const guardRoom = enemy.patrol
      ? guardPosition(enemy.patrol, state.time.elapsed)
      : enemy.roomId

    const chance = guardRoom === sourceRoomId ? chances.nearby : chances.distant
    if (chance === 0 || Math.random() >= chance) continue

    const current = es?.awareness ?? 'unaware'
    const next = escalateAwareness(current)
    if (next === current) continue

    updated[enemy.id] = {
      ...(es ?? { id: enemy.id, status: 'active', inventory: [...enemy.inventory] }),
      awareness: next,
    }
    changed = true
  }

  return changed ? updated : state.enemyStates
}
