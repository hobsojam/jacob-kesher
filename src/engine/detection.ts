import type { GameData, RoomData } from '../types/data'
import type { GameState, NoiseLevel } from '../types/state'
import { rollD20 } from './dice'
import { guardPosition } from './patrol'
import { escalateAwareness } from './alarm'

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
): { state: GameState; messages: string[] } {
  const dc = NOISE_DC[noise]
  if (dc === null) return { state, messages: [] }

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

    const enemyRoom = enemy.patrol
      ? guardPosition(enemy.patrol, state.time.elapsed)
      : enemy.roomId

    const distance = roomDistance(sourceRoomId, enemyRoom, data.roomIndex)
    if (distance > template.detectionRadius) continue

    if (roll() + template.stats.agility < dc) continue

    const next = escalateAwareness(current)
    updatedEnemyStates[enemy.id] = {
      ...(es ?? { id: enemy.id, status: 'active', inventory: [...enemy.inventory] }),
      awareness: next,
    }
    changed = true
    messages.push(
      next === 'alert'
        ? `${enemy.name} is on high alert.`
        : `${enemy.name} heard something.`,
    )
  }

  return {
    state: changed ? { ...state, enemyStates: updatedEnemyStates } : state,
    messages,
  }
}

// BFS over exits (ignoring lock requirements — sound doesn't check doors)
function roomDistance(fromId: string, toId: string, roomIndex: Record<string, RoomData>): number {
  if (fromId === toId) return 0
  const visited = new Set<string>()
  const queue: Array<{ id: string; dist: number }> = [{ id: fromId, dist: 0 }]
  while (queue.length > 0) {
    const { id, dist } = queue.shift()!
    if (visited.has(id)) continue
    visited.add(id)
    const room = roomIndex[id]
    if (!room) continue
    for (const exit of room.exits) {
      if (exit.destinationId === toId) return dist + 1
      if (!visited.has(exit.destinationId)) {
        queue.push({ id: exit.destinationId, dist: dist + 1 })
      }
    }
  }
  return Infinity
}
