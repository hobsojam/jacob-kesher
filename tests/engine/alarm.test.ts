import { describe, it, expect, vi } from 'vitest'
import { escalateAwareness, applyNoise } from '../../src/engine/alarm'
import { makeState, makeGameData } from '../helpers'
import type { EnemyData } from '../../src/types/data'

describe('escalateAwareness', () => {
  it('advances from unaware to suspicious', () => {
    expect(escalateAwareness('unaware')).toBe('suspicious')
  })

  it('advances from suspicious to alert', () => {
    expect(escalateAwareness('suspicious')).toBe('alert')
  })

  it('clamps at alert', () => {
    expect(escalateAwareness('alert')).toBe('alert')
  })
})

const nearbyGuard: EnemyData = {
  id: 'guard_1', name: 'Guard', templateId: 'guard', roomId: 'room_a', inventory: [],
}

const distantGuard: EnemyData = {
  id: 'guard_1', name: 'Guard', templateId: 'guard', roomId: 'room_b', inventory: [],
}

describe('applyNoise', () => {
  it('silent noise never escalates any guard', () => {
    const state = makeState()
    const data = makeGameData({ enemyData: { guard_1: nearbyGuard } })
    const result = applyNoise('silent', 'room_a', state, data)
    expect(result).toBe(state.enemyStates)
  })

  it('escalates a same-room guard when roll is below threshold', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    const state = makeState()
    const data = makeGameData({ enemyData: { guard_1: nearbyGuard } })
    const result = applyNoise('quiet', 'room_a', state, data)
    expect(result['guard_1']?.awareness).toBe('suspicious')
    vi.restoreAllMocks()
  })

  it('does not escalate a same-room guard when roll is above threshold', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const state = makeState()
    const data = makeGameData({ enemyData: { guard_1: nearbyGuard } })
    const result = applyNoise('alarming', 'room_a', state, data)
    expect(result['guard_1']?.awareness).toBeUndefined()
    vi.restoreAllMocks()
  })

  it('quiet noise does not reach guards in other rooms', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    const state = makeState()
    const data = makeGameData({ enemyData: { guard_1: distantGuard } })
    const result = applyNoise('quiet', 'room_a', state, data)
    expect(result['guard_1']?.awareness).toBeUndefined()
    vi.restoreAllMocks()
  })

  it('alarming noise can reach guards in other rooms', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    const state = makeState()
    const data = makeGameData({ enemyData: { guard_1: distantGuard } })
    const result = applyNoise('alarming', 'room_a', state, data)
    expect(result['guard_1']?.awareness).toBe('suspicious')
    vi.restoreAllMocks()
  })

  it('skips unconscious and dead guards', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    const state = makeState({
      enemyStates: { guard_1: { id: 'guard_1', status: 'unconscious', inventory: [] } },
    })
    const data = makeGameData({ enemyData: { guard_1: nearbyGuard } })
    const result = applyNoise('alarming', 'room_a', state, data)
    expect(result['guard_1']?.awareness).toBeUndefined()
    vi.restoreAllMocks()
  })

  it('returns the same enemyStates reference when nothing changes', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const state = makeState()
    const data = makeGameData({ enemyData: { guard_1: nearbyGuard } })
    const result = applyNoise('alarming', 'room_a', state, data)
    expect(result).toBe(state.enemyStates)
    vi.restoreAllMocks()
  })
})
