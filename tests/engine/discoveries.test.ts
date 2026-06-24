import { describe, it, expect } from 'vitest'
import { processAction } from '../../src/engine/index'
import { makeRoom, makeRoomState, makeState, makeGameData, emptyInventory } from '../helpers'
import type { EnemyData, EnemyTemplate } from '../../src/types/data'

const guardTemplate: EnemyTemplate = {
  id: 'guard',
  type: 'guard',
  stats: { strength: 3, agility: 3, health: 1, intelligence: 2 },
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
// Active watcher in room_a — same room as guard_1 (guardData.roomId = 'room_a')
const watcher: EnemyData = { id: 'watcher', name: 'Watcher', templateId: 'guard', roomId: 'room_a', inventory: [] }

// Data with watcher so geography check allows discovery to fire for guard_1
const dataWithWatcher = makeGameData({
  roomIndex: { room_a: makeRoom({ id: 'room_a' }) },
  enemyTemplates: { guard: guardTemplate },
  enemyData: { guard_1: guardData, watcher },
})

// Use a 1-turn action so discovery rolls fire; 'search' needs no extra setup beyond a roomState
const tickAction = { type: 'search' } as const

describe('checkDiscoveries via processAction', () => {
  it('raises the alarm when a downed guard is discovered', () => {
    // watcher is active in room_b (same room as guard_1's starting position)
    const state = makeState({
      roomStates: { room_a: makeRoomState({ id: 'room_a' }) },
      enemyStates: {
        guard_1: { id: 'guard_1', status: 'unconscious', inventory: [] },
      },
    })
    const result = processAction(tickAction, state, dataWithWatcher)

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
    const result = processAction(tickAction, state, dataWithTwo)

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
    const result = processAction(tickAction, state, safeData)

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
    const result = processAction(tickAction, state, data)

    expect(result.messages.some((m) => /alarm is raised/i.test(m))).toBe(false)
  })

  it('does not trigger for active enemies', () => {
    const state = makeState({
      roomStates: { room_a: makeRoomState({ id: 'room_a' }) },
      enemyStates: {
        guard_1: { id: 'guard_1', status: 'active', inventory: [] },
      },
    })
    const result = processAction(tickAction, state, data)

    expect(result.state.flags['alarm_raised']).toBeFalsy()
  })

  it('does not fire on zero-cost actions (drop)', () => {
    const inv = emptyInventory()
    inv.small[0] = 'key'
    const state = makeState({
      protagonist: { ...makeState().protagonist, inventory: inv },
      roomStates: { room_a: makeRoomState({ id: 'room_a' }) },
      itemStates: { key: { id: 'key', used: false, broken: false } },
      enemyStates: {
        guard_1: { id: 'guard_1', status: 'unconscious', inventory: [] },
      },
    })

    const result = processAction({ type: 'drop', itemId: 'key' }, state, data)

    expect(result.state.flags['alarm_raised']).toBeFalsy()
    expect(result.state.time.elapsed).toBe(0)   // confirms time did not advance
  })
})
