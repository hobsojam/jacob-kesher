import type { GameData } from '../types/data'
import type { GameState, NoiseLevel } from '../types/state'
import { rollD20 } from './dice'
import { enemyPosition } from './patrol'
import { escalateAwareness } from './alarm'
import { initEnemyState, enemyLabel, cap } from './room'
import { roomDistance } from './graph'

const NOISE_DC: Record<NoiseLevel, number | null> = {
  silent:   null,
  quiet:    15,
  loud:     10,
  alarming: 5,
}

export function checkDetection(
  noise: NoiseLevel,
  sourceRoomId: string,
  state: GameState,
  data: GameData,
  roll: () => number = rollD20,
  covertBonus = 0,
): { state: GameState; messages: string[] } {
  const dc = NOISE_DC[noise]
  if (dc === null) return { state, messages: [] }
  const effectiveDc = dc + covertBonus

  const messages: string[] = []
  const updatedEnemyStates = { ...state.enemyStates }
  let changed = false

  for (const enemy of Object.values(data.enemyData)) {
    const es = state.enemyStates[enemy.id]
    if (es && es.status !== 'active') continue

    const current = es?.awareness ?? 'unaware'
    if (current === 'alert') continue

    const template = data.enemyTemplates[enemy.templateId]
    if (!template) continue

    const enemyRoom = enemyPosition(enemy, state.time.elapsed, state.flags, es)

    const distance = roomDistance(sourceRoomId, enemyRoom, data.roomIndex)
    if (distance > template.detectionRadius) continue

    if (roll() + template.stats.agility < effectiveDc) continue

    const next = escalateAwareness(current)
    updatedEnemyStates[enemy.id] = {
      ...(es ?? initEnemyState(enemy)),
      awareness: next,
    }
    changed = true
    messages.push(
      next === 'alert'
        ? `${cap(enemyLabel(enemy, data))} is on high alert.`
        : `${cap(enemyLabel(enemy, data))} heard something.`,
    )
  }

  return {
    state: changed ? { ...state, enemyStates: updatedEnemyStates } : state,
    messages,
  }
}
