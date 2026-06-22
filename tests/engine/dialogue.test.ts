import { describe, it, expect, vi, afterEach } from 'vitest'
import { handleTalk } from '../../src/engine/dialogue'
import { processAction } from '../../src/engine/index'
import { makeState, makeRoomState, makeGameData } from '../helpers'
import type { EnemyTemplate, EnemyData } from '../../src/types/data'

afterEach(() => vi.restoreAllMocks())

const alwaysHit  = () => 20
const alwaysMiss = () => 1

const guardTemplate: EnemyTemplate = {
  id: 'guard',
  type: 'guard',
  stats: { strength: 3, agility: 3, health: 1 },
  detectionRadius: 1,
  canBeBluffed: true,
  canBeDisguised: true,
}

const dogTemplate: EnemyTemplate = {
  id: 'dog',
  type: 'dog',
  stats: { strength: 2, agility: 4, health: 1 },
  detectionRadius: 2,
  canBeBluffed: false,
  canBeDisguised: false,
}

const guard: EnemyData = { id: 'g1', name: 'Guard', templateId: 'guard', roomId: 'room_a', inventory: [] }
const dog:   EnemyData = { id: 'd1', name: 'Dog',   templateId: 'dog',   roomId: 'room_a', inventory: [] }

const data = makeGameData({
  enemyTemplates: { guard: guardTemplate, dog: dogTemplate },
  enemyData: { g1: guard, d1: dog },
})

function baseState() {
  return makeState({ roomStates: { room_a: makeRoomState() } })
}

describe('handleTalk — success path', () => {
  it('sets the guard awareness to unaware on a successful bluff', () => {
    const result = handleTalk('g1', baseState(), data, alwaysHit)

    expect(result.state.enemyStates['g1']?.awareness).toBe('unaware')
  })

  it('emits a success message', () => {
    const result = handleTalk('g1', baseState(), data, alwaysHit)

    expect(result.messages[0]).toMatch(/cover story holds/i)
  })

  it('produces no noise on success', () => {
    const result = handleTalk('g1', baseState(), data, alwaysHit)

    expect(result.noise).toBe('silent')
  })
})

describe('handleTalk — failure path', () => {
  it('sets the guard awareness to alert on a failed bluff', () => {
    const result = handleTalk('g1', baseState(), data, alwaysMiss)

    expect(result.state.enemyStates['g1']?.awareness).toBe('alert')
  })

  it('emits a failure message', () => {
    const result = handleTalk('g1', baseState(), data, alwaysMiss)

    expect(result.messages[0]).toMatch(/doesn't buy it/i)
  })

  it('generates quiet noise on failure', () => {
    const result = handleTalk('g1', baseState(), data, alwaysMiss)

    expect(result.noise).toBe('quiet')
  })
})

describe('handleTalk — edge cases', () => {
  it('rejects talking to a dog (canBeBluffed: false)', () => {
    const state = baseState()
    const result = handleTalk('d1', state, data)

    expect(result.messages[0]).toMatch(/not impressed/i)
    expect(result.state).toBe(state)
  })

  it('rejects talking to an unconscious enemy', () => {
    const state = makeState({
      enemyStates: { g1: { id: 'g1', status: 'unconscious', unconsciousUntil: 999, inventory: [] } },
    })

    const result = handleTalk('g1', state, data)

    expect(result.messages[0]).toMatch(/no state to talk/i)
  })

  it('rejects an unknown enemy id', () => {
    const result = handleTalk('nobody', baseState(), data)

    expect(result.messages[0]).toMatch(/no one there/i)
  })

  it('uses charisma stat in the roll', () => {
    // charisma 20 + roll 1 = 21, beats any resistance
    const state = makeState({
      protagonist: { ...makeState().protagonist, stats: { strength: 5, agility: 5, intelligence: 5, charisma: 20 } },
    })

    const result = handleTalk('g1', state, data, alwaysMiss)

    expect(result.state.enemyStates['g1']?.awareness).toBe('unaware')
  })

  it('preserves existing enemy inventory on state update', () => {
    const state = makeState({
      enemyStates: { g1: { id: 'g1', status: 'active', awareness: 'suspicious', inventory: ['pistol'] } },
    })

    const result = handleTalk('g1', state, data, alwaysHit)

    expect(result.state.enemyStates['g1'].inventory).toEqual(['pistol'])
  })
})

describe('failed bluff — pipeline ambush', () => {
  it('guard attacks immediately when bluff fails (same room)', () => {
    // First random call is the bluff roll: 0 → rollD20=1, 1+cha5=6 < DC10 → fail.
    // Subsequent calls are the guard attack roll: 0.99 → rollD20=20 → hit.
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValue(0.99)
    const state = makeState({ roomStates: { room_a: makeRoomState() } })

    const result = processAction({ type: 'talk', enemyId: 'g1' }, state, data)

    expect(result.messages.some((m) => /attacks/i.test(m))).toBe(true)
    expect(result.state.protagonist.health).toBeLessThan(10)
  })

  it('guard does not attack when bluff succeeds', () => {
    // Roll 0 → rollD20=1, 1+cha5=6 < DC10 normally fails,
    // but with charisma 20: 1+20=21 ≥ DC10 → success. No attack.
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const highChaState = makeState({
      protagonist: { ...makeState().protagonist, stats: { strength: 3, agility: 4, intelligence: 3, charisma: 20 } },
      roomStates: { room_a: makeRoomState() },
    })

    const result = processAction({ type: 'talk', enemyId: 'g1' }, highChaState, data)

    expect(result.state.protagonist.health).toBe(10)
    expect(result.messages.some((m) => /attacks/i.test(m))).toBe(false)
  })
})
