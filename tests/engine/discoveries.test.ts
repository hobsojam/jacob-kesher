import { describe, it, expect } from 'vitest'
import { processAction } from '../../src/engine/index'
import { makeRoom, makeRoomState, makeState, makeGameData } from '../helpers'
import type { EnemyData, EnemyTemplate } from '../../src/types/data'

const guardTemplate: EnemyTemplate = {
  id: 'guard',
  type: 'guard',
  stats: { strength: 3, agility: 3, health: 1 },
  detectionRadius: 1,
  canBeBluffed: false,
  canBeDisguised: false,
  discoveryRisk: 1,  // guaranteed to trigger for deterministic tests
}

const guardData: EnemyData = {
  id: 'guard_1',
  name: 'Boris',
  templateId: 'guard',
  roomId: 'room_a',
  inventory: [],
}

const data = makeGameData({
  roomIndex: { room_a: makeRoom({ id: 'room_a' }) },
  enemyTemplates: { guard: guardTemplate },
  enemyData: { guard_1: guardData },
})

const secondGuard: EnemyData = { id: 'guard_2', name: 'Alexei', templateId: 'guard', roomId: 'room_a', inventory: [] }

describe('checkDiscoveries via processAction', () => {
  it('raises the alarm when a downed guard is discovered', () => {
    const state = makeState({
      roomStates: { room_a: makeRoomState({ id: 'room_a' }) },
      enemyStates: {
        guard_1: { id: 'guard_1', status: 'unconscious', inventory: [] },
      },
    })
    const result = processAction({ type: 'look' }, state, data)

    expect(result.state.flags['alarm_raised']).toBe(true)
    expect(result.messages.some((m) => /alarm/i.test(m))).toBe(true)
  })

  it('escalates active guards to alert when the alarm triggers', () => {
    const state = makeState({
      roomStates: { room_a: makeRoomState({ id: 'room_a' }) },
      enemyStates: {
        guard_1: { id: 'guard_1', status: 'unconscious', inventory: [] },
        guard_2: { id: 'guard_2', status: 'active', inventory: [] },
      },
    })
    const dataWithTwo = makeGameData({
      ...data,
      enemyData: { guard_1: guardData, guard_2: secondGuard },
    })
    const result = processAction({ type: 'look' }, state, dataWithTwo)

    expect(result.state.enemyStates['guard_2']?.awareness).toBe('alert')
  })

  it('does not trigger when discoveryRisk is 0', () => {
    const safeTemplate: EnemyTemplate = { ...guardTemplate, discoveryRisk: 0 }
    const safeData = makeGameData({
      roomIndex: { room_a: makeRoom({ id: 'room_a' }) },
      enemyTemplates: { guard: safeTemplate },
      enemyData: { guard_1: guardData },
    })
    const state = makeState({
      roomStates: { room_a: makeRoomState({ id: 'room_a' }) },
      enemyStates: {
        guard_1: { id: 'guard_1', status: 'unconscious', inventory: [] },
      },
    })
    const result = processAction({ type: 'look' }, state, safeData)

    expect(result.state.flags['alarm_raised']).toBeFalsy()
  })

  it('does not fire again once the alarm is already raised', () => {
    const state = makeState({
      flags: { alarm_raised: true },
      roomStates: { room_a: makeRoomState({ id: 'room_a' }) },
      enemyStates: {
        guard_1: { id: 'guard_1', status: 'unconscious', inventory: [] },
      },
    })
    const result = processAction({ type: 'look' }, state, data)

    expect(result.messages.some((m) => /alarm is raised/i.test(m))).toBe(false)
  })

  it('does not trigger for active enemies', () => {
    const state = makeState({
      roomStates: { room_a: makeRoomState({ id: 'room_a' }) },
      enemyStates: {
        guard_1: { id: 'guard_1', status: 'active', inventory: [] },
      },
    })
    const result = processAction({ type: 'look' }, state, data)

    expect(result.state.flags['alarm_raised']).toBeFalsy()
  })
})
