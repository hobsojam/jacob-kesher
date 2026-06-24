import { describe, it, expect, vi } from 'vitest'
import { checkDiscoveries } from '../../src/engine/discovery'
import { makeState, makeGameData } from '../helpers'
import type { EnemyData, EnemyTemplate } from '../../src/types/data'
import type { EnemyState } from '../../src/types/state'

const alwaysDiscover = () => 0    // 0 < any positive risk → always triggers
const neverDiscover  = () => 1    // 1 < risk → never triggers (risk is 0–1)

const guardTemplate: EnemyTemplate = {
  id: 'guard',
  type: 'guard',
  stats: { strength: 3, agility: 3, health: 1, intelligence: 2 },
  detectionRadius: 1,
  canBeBluffed: true,
  canBeDisguised: true,
  discoveryRisk: 0.1,
}

const noRiskTemplate: EnemyTemplate = {
  ...guardTemplate,
  id: 'invisible_guard',
  discoveryRisk: 0,
}

const guard: EnemyData = { id: 'g1', name: 'Pvt. Morozov', templateId: 'guard', roomId: 'room_a', inventory: [] }
const noRiskGuard: EnemyData = { id: 'g2', name: 'Ghost', templateId: 'invisible_guard', roomId: 'room_a', inventory: [] }
const patrolGuard: EnemyData = { id: 'g3', name: 'Sgt. Volkov', templateId: 'guard', roomId: 'room_a', inventory: [] }
// Active guard in room_a — needed for geography check to allow discovery
const watcher: EnemyData = { id: 'watcher', name: 'Watcher', templateId: 'guard', roomId: 'room_a', inventory: [] }

const activeGuard: EnemyData = { id: 'active', name: 'On Duty', templateId: 'guard', roomId: 'room_a', inventory: [] }

// enemyStates without 'watcher' → watcher defaults to active, providing the geography check
function withEnemies(enemyData: Record<string, EnemyData>, enemyStates: Record<string, EnemyState> = {}) {
  return {
    data: makeGameData({
      enemyTemplates: { guard: guardTemplate, invisible_guard: noRiskTemplate },
      enemyData,
    }),
    state: makeState({ enemyStates }),
  }
}

describe('checkDiscoveries — alarm already raised', () => {
  it('returns immediately without rolling dice', () => {
    const roll = vi.fn(() => 0)  // would always trigger if called
    const { data } = withEnemies(
      { g1: guard },
      { g1: { id: 'g1', status: 'unconscious', inventory: [] } },
    )
    const state = makeState({
      flags: { alarm_raised: true },
      enemyStates: { g1: { id: 'g1', status: 'unconscious', inventory: [] } },
    })
    const result = checkDiscoveries(state, data, roll)

    expect(roll).not.toHaveBeenCalled()
    expect(result.state).toBe(state)
    expect(result.messages).toHaveLength(0)
  })
})

describe('checkDiscoveries — no trigger', () => {
  it('returns unchanged state when no enemies are downed', () => {
    const { state, data } = withEnemies({ g1: guard })
    const result = checkDiscoveries(state, data, alwaysDiscover)

    expect(result.state).toBe(state)
    expect(result.messages).toHaveLength(0)
  })

  it('returns unchanged state when roll does not trigger', () => {
    const { state, data } = withEnemies(
      { g1: guard },
      { g1: { id: 'g1', status: 'unconscious', inventory: [] } },
    )
    const result = checkDiscoveries(state, data, neverDiscover)

    expect(result.state).toBe(state)
    expect(result.messages).toHaveLength(0)
  })

  it('skips enemies with no discoveryRisk', () => {
    const { state, data } = withEnemies(
      { g2: noRiskGuard },
      { g2: { id: 'g2', status: 'dead', inventory: [] } },
    )
    const result = checkDiscoveries(state, data, alwaysDiscover)

    expect(result.state).toBe(state)
    expect(result.messages).toHaveLength(0)
  })

  it('skips active enemies', () => {
    const { state, data } = withEnemies({ g1: guard })
    const result = checkDiscoveries(state, data, alwaysDiscover)

    expect(result.messages).toHaveLength(0)
  })
})

describe('checkDiscoveries — trigger', () => {
  it('raises alarm_raised flag when a downed guard is found', () => {
    // watcher is active in room_a; g1 is the downed body also in room_a
    const { state, data } = withEnemies(
      { g1: guard, watcher },
      { g1: { id: 'g1', status: 'unconscious', inventory: [] } },
    )
    const result = checkDiscoveries(state, data, alwaysDiscover)

    expect(result.state.flags['alarm_raised']).toBe(true)
  })

  it('emits a discovery message naming the found guard', () => {
    const { state, data } = withEnemies(
      { g1: guard, watcher },
      { g1: { id: 'g1', status: 'unconscious', inventory: [] } },
    )
    const result = checkDiscoveries(state, data, alwaysDiscover)

    expect(result.messages[0]).toMatch(/a guard/i)
    expect(result.messages[0]).toMatch(/alarm is raised/i)
  })

  it('sets all active guards to alert on discovery', () => {
    const { state, data } = withEnemies(
      { g1: guard, active: activeGuard },
      { g1: { id: 'g1', status: 'dead', inventory: [] } },
    )
    const result = checkDiscoveries(state, data, alwaysDiscover)

    expect(result.state.enemyStates['active']?.awareness).toBe('alert')
  })

  it('does not change already-downed enemies when raising alert', () => {
    // watcher provides the active guard so discovery can fire
    const { state, data } = withEnemies(
      { g1: guard, g3: patrolGuard, watcher },
      {
        g1: { id: 'g1', status: 'dead', inventory: [] },
        g3: { id: 'g3', status: 'unconscious', inventory: [] },
      },
    )
    const result = checkDiscoveries(state, data, alwaysDiscover)

    expect(result.state.enemyStates['g3']?.status).toBe('unconscious')
  })

  it('names multiple found guards in the message', () => {
    const { state, data } = withEnemies(
      { g1: guard, g3: patrolGuard, watcher },
      {
        g1: { id: 'g1', status: 'dead', inventory: [] },
        g3: { id: 'g3', status: 'unconscious', inventory: [] },
      },
    )
    const result = checkDiscoveries(state, data, alwaysDiscover)

    expect(result.messages[0]).toMatch(/a guard/i)
    expect(result.messages[0]).toMatch(/found/i)
  })

  it('does not trigger when no active guard is near the body', () => {
    // watcher is in room_b; body is in room_a → different rooms → no discovery
    const farWatcher: EnemyData = { ...watcher, roomId: 'room_b' }
    const { state, data } = withEnemies(
      { g1: guard, farWatcher },
      { g1: { id: 'g1', status: 'unconscious', inventory: [] } },
    )
    const result = checkDiscoveries(state, data, alwaysDiscover)

    expect(result.state.flags['alarm_raised']).toBeFalsy()
    expect(result.messages).toHaveLength(0)
  })

  it('uses bodyRoomId over enemyData.roomId when set', () => {
    // g1 data says room_b, but bodyRoomId says room_a where watcher patrols
    const g1AwayFromHome: EnemyData = { ...guard, roomId: 'room_b' }
    const { state, data } = withEnemies(
      { g1: g1AwayFromHome, watcher },
      { g1: { id: 'g1', status: 'dead', inventory: [], bodyRoomId: 'room_a' } },
    )
    const result = checkDiscoveries(state, data, alwaysDiscover)

    expect(result.state.flags['alarm_raised']).toBe(true)
  })
})
