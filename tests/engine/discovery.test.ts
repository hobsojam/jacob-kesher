import { describe, it, expect } from 'vitest'
import { checkDiscoveries } from '../../src/engine/discovery'
import { makeState, makeGameData } from '../helpers'
import type { EnemyData, EnemyTemplate } from '../../src/types/data'
import type { EnemyState } from '../../src/types/state'

const alwaysDiscover = () => 0    // 0 < any positive risk → always triggers
const neverDiscover  = () => 1    // 1 < risk → never triggers (risk is 0–1)

const guardTemplate: EnemyTemplate = {
  id: 'guard',
  type: 'guard',
  stats: { strength: 3, agility: 3, health: 1 },
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

const activeGuard: EnemyData = { id: 'active', name: 'On Duty', templateId: 'guard', roomId: 'room_a', inventory: [] }

function withEnemies(enemyData: Record<string, EnemyData>, enemyStates: Record<string, EnemyState> = {}) {
  return {
    data: makeGameData({
      enemyTemplates: { guard: guardTemplate, invisible_guard: noRiskTemplate },
      enemyData,
    }),
    state: makeState({ enemyStates }),
  }
}

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
    const { state, data } = withEnemies(
      { g1: guard },
      { g1: { id: 'g1', status: 'unconscious', inventory: [] } },
    )
    const result = checkDiscoveries(state, data, alwaysDiscover)

    expect(result.state.flags['alarm_raised']).toBe(true)
  })

  it('emits a discovery message naming the found guard', () => {
    const { state, data } = withEnemies(
      { g1: guard },
      { g1: { id: 'g1', status: 'unconscious', inventory: [] } },
    )
    const result = checkDiscoveries(state, data, alwaysDiscover)

    expect(result.messages[0]).toMatch(/Pvt\. Morozov/i)
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
    const { state, data } = withEnemies(
      { g1: guard, g3: patrolGuard },
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
      { g1: guard, g3: patrolGuard },
      {
        g1: { id: 'g1', status: 'dead', inventory: [] },
        g3: { id: 'g3', status: 'unconscious', inventory: [] },
      },
    )
    const result = checkDiscoveries(state, data, alwaysDiscover)

    expect(result.messages[0]).toMatch(/Pvt\. Morozov/i)
    expect(result.messages[0]).toMatch(/Sgt\. Volkov/i)
  })
})
