import type { EnemyData, PatrolRoute } from '../types/data'

export function guardPosition(patrol: PatrolRoute, elapsed: number): string {
  const offset = patrol.startOffset ?? 0
  const turnsPerRoom = patrol.cycleTime / patrol.roomIds.length
  const index = Math.floor(((elapsed + offset) % patrol.cycleTime) / turnsPerRoom)
  return patrol.roomIds[index]
}

// Single source of truth for "where is this enemy right now".
// Alarm overrides take priority: alarmRoomId pins them to a fixed room,
// alarmPatrol replaces their route. Falls back to normal patrol or roomId.
export function enemyPosition(
  enemy: EnemyData,
  elapsed: number,
  flags: Record<string, boolean>,
): string {
  if (flags['alarm_raised']) {
    if (enemy.alarmRoomId) return enemy.alarmRoomId
    if (enemy.alarmPatrol) return guardPosition(enemy.alarmPatrol, elapsed)
  }
  if (enemy.patrol) return guardPosition(enemy.patrol, elapsed)
  return enemy.roomId
}
