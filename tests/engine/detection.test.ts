import { describe, it, expect } from 'vitest'
import { checkDetection } from '../../src/engine/detection'
import { makeState, makeRoom, makeRoomState, makeGameData } from '../helpers'
import type { EnemyData, EnemyTemplate } from '../../src/types/data'

const alwaysHit  = () => 20
const alwaysMiss = () => 1

const makeTemplate = (partial: Partial<EnemyTemplate> = {}): EnemyTemplate => {
  const { stats: partialStats, ...rest } = partial
  return {
    id: 'guard',
    type: 'guard',
    stats: { strength: 3, agility: 0, health: 1, intelligence: 2, ...partialStats },
    detectionRadius: 1,
    canBeBluffed: false,
    canBeDisguised: false,
    ...rest,
  }
}

const makeGuard = (partial: Partial<EnemyData> = {}): EnemyData => ({
  id: 'g1',
  name: 'Boris',
  templateId: 'guard',
  roomId: 'room_a',
  inventory: [],
  ...partial,
})

// Two connected rooms for distance tests
const roomA = makeRoom({ id: 'room_a', exits: [{ destinationId: 'room_b', label: 'go to room b' }] })
const roomB = makeRoom({ id: 'room_b' })

const baseData = () =>
  makeGameData({
    roomIndex: { room_a: roomA, room_b: roomB },
    enemyData: { g1: makeGuard() },
    enemyTemplates: { guard: makeTemplate() },
  })

describe('checkDetection — noise DC', () => {
  it('silent noise skips all guards and returns the same state reference', () => {
    const state = makeState()
    const result = checkDetection('silent', 'room_a', state, baseData(), alwaysHit)
    expect(result.state).toBe(state)
    expect(result.messages).toHaveLength(0)
  })

  it('quiet noise: roll + agility >= 15 escalates guard (threshold)', () => {
    // agility 0, roll 15 → 15 >= 15 → passes
    const state = makeState()
    const result = checkDetection('quiet', 'room_a', state, baseData(), () => 15)
    expect(result.state.enemyStates['g1']?.awareness).toBe('suspicious')
  })

  it('quiet noise: roll + agility < 15 does not escalate (threshold)', () => {
    // agility 0, roll 14 → 14 < 15 → fails
    const state = makeState()
    const result = checkDetection('quiet', 'room_a', state, baseData(), () => 14)
    expect(result.state.enemyStates['g1']).toBeUndefined()
  })

  it('loud noise uses DC 10', () => {
    // agility 0, roll 10 → 10 >= 10 → passes
    const state = makeState()
    const result = checkDetection('loud', 'room_a', state, baseData(), () => 10)
    expect(result.state.enemyStates['g1']?.awareness).toBe('suspicious')
  })

  it('loud noise: roll 9 fails DC 10', () => {
    const state = makeState()
    const result = checkDetection('loud', 'room_a', state, baseData(), () => 9)
    expect(result.state.enemyStates['g1']).toBeUndefined()
  })

  it('alarming noise uses DC 5', () => {
    // agility 0, roll 5 → 5 >= 5 → passes
    const state = makeState()
    const result = checkDetection('alarming', 'room_a', state, baseData(), () => 5)
    expect(result.state.enemyStates['g1']?.awareness).toBe('suspicious')
  })
})

describe('checkDetection — detection radius', () => {
  it('detects a guard in the same room (distance 0)', () => {
    const state = makeState()
    const result = checkDetection('quiet', 'room_a', state, baseData(), alwaysHit)
    expect(result.state.enemyStates['g1']?.awareness).toBe('suspicious')
  })

  it('detects a guard in an adjacent room when within detectionRadius', () => {
    const state = makeState()
    const data = makeGameData({
      roomIndex: { room_a: roomA, room_b: roomB },
      enemyData: { g1: makeGuard({ roomId: 'room_b' }) },
      enemyTemplates: { guard: makeTemplate({ detectionRadius: 1 }) },
    })
    // DC 5 (alarming), roll 5, agility 0 → 5 >= 5 → passes
    const result = checkDetection('alarming', 'room_a', state, data, () => 5)
    expect(result.state.enemyStates['g1']?.awareness).toBe('suspicious')
  })

  it('does not detect a guard beyond detectionRadius', () => {
    const state = makeState()
    const data = makeGameData({
      roomIndex: { room_a: roomA, room_b: roomB },
      enemyData: { g1: makeGuard({ roomId: 'room_b' }) },
      enemyTemplates: { guard: makeTemplate({ detectionRadius: 0 }) },
    })
    const result = checkDetection('alarming', 'room_a', state, data, alwaysHit)
    expect(result.state.enemyStates['g1']).toBeUndefined()
  })

  it('guard agility adds to detection roll', () => {
    // Guard agility 3, roll 11 → 14 >= 15? No. Roll 12 → 15 → yes.
    const data = makeGameData({
      roomIndex: { room_a: roomA },
      enemyData: { g1: makeGuard() },
      enemyTemplates: { guard: makeTemplate({ stats: { strength: 3, agility: 3, health: 1, intelligence: 2 } }) },
    })
    const state = makeState()
    expect(checkDetection('quiet', 'room_a', state, data, () => 11).state.enemyStates['g1']).toBeUndefined()
    expect(checkDetection('quiet', 'room_a', state, data, () => 12).state.enemyStates['g1']?.awareness).toBe('suspicious')
  })
})

describe('checkDetection — awareness escalation', () => {
  it('escalates suspicious → alert', () => {
    const state = makeState({
      enemyStates: { g1: { id: 'g1', status: 'active', awareness: 'suspicious', inventory: [] } },
    })
    const result = checkDetection('quiet', 'room_a', state, baseData(), alwaysHit)
    expect(result.state.enemyStates['g1']?.awareness).toBe('alert')
  })

  it('does not re-escalate an already-alert guard', () => {
    const state = makeState({
      enemyStates: { g1: { id: 'g1', status: 'active', awareness: 'alert', inventory: [] } },
    })
    const result = checkDetection('alarming', 'room_a', state, baseData(), alwaysHit)
    expect(result.state).toBe(state)
  })

  it('skips unconscious guards', () => {
    const state = makeState({
      enemyStates: { g1: { id: 'g1', status: 'unconscious', inventory: [] } },
    })
    const result = checkDetection('alarming', 'room_a', state, baseData(), alwaysHit)
    expect(result.state).toBe(state)
  })

  it('skips dead guards', () => {
    const state = makeState({
      enemyStates: { g1: { id: 'g1', status: 'dead', inventory: [] } },
    })
    const result = checkDetection('alarming', 'room_a', state, baseData(), alwaysHit)
    expect(result.state).toBe(state)
  })

  it('returns unchanged state reference when nothing escalates', () => {
    const state = makeState()
    const result = checkDetection('quiet', 'room_a', state, baseData(), alwaysMiss)
    expect(result.state).toBe(state)
  })
})

describe('checkDetection — messages', () => {
  it('emits "heard something" when escalating unaware → suspicious', () => {
    const state = makeState()
    const result = checkDetection('quiet', 'room_a', state, baseData(), alwaysHit)
    expect(result.messages[0]).toMatch(/heard something/i)
  })

  it('emits "high alert" when escalating suspicious → alert', () => {
    const state = makeState({
      enemyStates: { g1: { id: 'g1', status: 'active', awareness: 'suspicious', inventory: [] } },
    })
    const result = checkDetection('quiet', 'room_a', state, baseData(), alwaysHit)
    expect(result.messages[0]).toMatch(/high alert/i)
  })

  it('emits no messages when no escalation occurs', () => {
    const state = makeState()
    const result = checkDetection('quiet', 'room_a', state, baseData(), alwaysMiss)
    expect(result.messages).toHaveLength(0)
  })
})

describe('checkDetection — proximity (via processAction move)', () => {
  it('a guard in the destination room may detect Jacob on entry', async () => {
    const { processAction } = await import('../../src/engine/index')
    const guard = makeGuard({ roomId: 'room_b' })
    const template = makeTemplate({ detectionRadius: 1, stats: { strength: 3, agility: 20, health: 1, intelligence: 2 } })
    // agility 20 guarantees detection on any roll (20+20=40 >= DC 15)
    const data = makeGameData({
      roomIndex: {
        room_a: makeRoom({ id: 'room_a', exits: [{ destinationId: 'room_b', label: 'go north' }] }),
        room_b: makeRoom({ id: 'room_b' }),
      },
      enemyData: { g1: guard },
      enemyTemplates: { guard: template },
    })
    const state = makeState({
      protagonist: { currentRoom: 'room_a' } as never,
      roomStates: { room_a: makeRoomState(), room_b: makeRoomState() },
    })
    const result = processAction({ type: 'move', exitLabel: 'go north' }, state, data)
    expect(result.state.enemyStates['g1']?.awareness).toBe('suspicious')
  })

  it('a guard with detectionRadius 0 in an adjacent room does not detect Jacob on entry', async () => {
    const { processAction } = await import('../../src/engine/index')
    const guard = makeGuard({ roomId: 'room_c' })
    const roomC = makeRoom({ id: 'room_c' })
    const template = makeTemplate({ detectionRadius: 0, stats: { strength: 3, agility: 20, health: 1, intelligence: 2 } })
    const data = makeGameData({
      roomIndex: {
        room_a: makeRoom({ id: 'room_a', exits: [{ destinationId: 'room_b', label: 'go north' }] }),
        room_b: makeRoom({ id: 'room_b', exits: [{ destinationId: 'room_c', label: 'go east' }] }),
        room_c: roomC,
      },
      enemyData: { g1: guard },
      enemyTemplates: { guard: template },
    })
    const state = makeState({
      protagonist: { currentRoom: 'room_a' } as never,
      roomStates: { room_a: makeRoomState(), room_b: makeRoomState(), room_c: makeRoomState() },
    })
    const result = processAction({ type: 'move', exitLabel: 'go north' }, state, data)
    expect(result.state.enemyStates['g1']).toBeUndefined()
  })
})
