import { describe, it, expect } from 'vitest'
import { guardPosition, enemyPosition } from '../../src/engine/patrol'
import type { EnemyData } from '../../src/types/data'

const noAlarm: Record<string, boolean> = {}
const alarm: Record<string, boolean> = { alarm_raised: true }

const makeEnemy = (partial: Partial<EnemyData>): EnemyData => ({
  id: 'e1',
  name: 'Guard',
  templateId: 'guard',
  roomId: 'room_a',
  inventory: [],
  ...partial,
})

describe('guardPosition', () => {
  it('returns correct room based on elapsed turns', () => {
    const patrol = { roomIds: ['room_a', 'room_b'], cycleTime: 4 }
    expect(guardPosition(patrol, 0)).toBe('room_a')
    expect(guardPosition(patrol, 2)).toBe('room_b')
    expect(guardPosition(patrol, 4)).toBe('room_a') // wraps
  })

  it('applies startOffset', () => {
    const patrol = { roomIds: ['room_a', 'room_b'], cycleTime: 4, startOffset: 2 }
    expect(guardPosition(patrol, 0)).toBe('room_b')
  })
})

describe('enemyPosition', () => {
  it('returns roomId for stationary enemy', () => {
    const enemy = makeEnemy({ roomId: 'room_a' })
    expect(enemyPosition(enemy, 0, noAlarm)).toBe('room_a')
  })

  it('returns patrol position without alarm', () => {
    const enemy = makeEnemy({ patrol: { roomIds: ['room_a', 'room_b'], cycleTime: 4 } })
    expect(enemyPosition(enemy, 0, noAlarm)).toBe('room_a')
    expect(enemyPosition(enemy, 2, noAlarm)).toBe('room_b')
  })

  it('alarm: pins enemy to alarmRoomId regardless of patrol', () => {
    const enemy = makeEnemy({
      patrol: { roomIds: ['room_a', 'room_b'], cycleTime: 4 },
      alarmRoomId: 'room_c',
    })
    expect(enemyPosition(enemy, 0, alarm)).toBe('room_c')
    expect(enemyPosition(enemy, 2, alarm)).toBe('room_c') // patrol overridden
  })

  it('alarm: uses alarmPatrol when set and no alarmRoomId', () => {
    const enemy = makeEnemy({
      patrol: { roomIds: ['room_a', 'room_b'], cycleTime: 4 },
      alarmPatrol: { roomIds: ['room_c', 'room_d'], cycleTime: 4 },
    })
    expect(enemyPosition(enemy, 0, alarm)).toBe('room_c')
    expect(enemyPosition(enemy, 2, alarm)).toBe('room_d')
  })

  it('no alarm: alarmRoomId has no effect', () => {
    const enemy = makeEnemy({
      patrol: { roomIds: ['room_a', 'room_b'], cycleTime: 4 },
      alarmRoomId: 'room_c',
    })
    expect(enemyPosition(enemy, 0, noAlarm)).toBe('room_a') // normal patrol
  })

  it('alarm: stationary enemy with alarmRoomId moves to new room', () => {
    const enemy = makeEnemy({ roomId: 'room_a', alarmRoomId: 'room_b' })
    expect(enemyPosition(enemy, 0, noAlarm)).toBe('room_a')
    expect(enemyPosition(enemy, 0, alarm)).toBe('room_b')
  })
})
