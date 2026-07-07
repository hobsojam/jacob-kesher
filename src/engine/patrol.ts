import type { EnemyData, PatrolRoute } from '../types/data'
import type { EnemyState } from '../types/state'

export function guardPosition(patrol: PatrolRoute, elapsed: number): string {
  const offset = patrol.startOffset ?? 0
  const turnsPerRoom = patrol.cycleTime / patrol.roomIds.length
  const index = Math.floor(((elapsed + offset) % patrol.cycleTime) / turnsPerRoom)
  return patrol.roomIds[index]
}

// Single source of truth for "where is this enemy right now".
// Pursuit takes priority over everything else: a chasing enemy tracks Jacob's
// last-known room rather than their formulaic patrol/alarm position. Alarm
// overrides come next: alarmRoomId pins them to a fixed room, alarmPatrol
// replaces their route. Falls back to normal patrol or roomId.
export function enemyPosition(
  enemy: EnemyData,
  elapsed: number,
  flags: Record<string, boolean>,
  enemyState?: EnemyState,
): string {
  if (enemyState?.pursuit) return enemyState.pursuit.roomId
  if (flags['alarm_raised']) {
    if (enemy.alarmRoomId) return enemy.alarmRoomId
    if (enemy.alarmPatrol) return guardPosition(enemy.alarmPatrol, elapsed)
  }
  if (enemy.patrol) return guardPosition(enemy.patrol, elapsed)
  return enemy.roomId
}
