import type { PatrolRoute } from '../types/data'

export function guardPosition(patrol: PatrolRoute, elapsed: number): string {
  const offset = patrol.startOffset ?? 0
  const turnsPerRoom = patrol.cycleTime / patrol.roomIds.length
  const index = Math.floor(((elapsed + offset) % patrol.cycleTime) / turnsPerRoom)
  return patrol.roomIds[index]
}
