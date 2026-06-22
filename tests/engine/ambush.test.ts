import { describe, it, expect, vi, afterEach } from 'vitest'
import { processAction } from '../../src/engine/index'
import { makeState, makeRoom, makeRoomState, makeGameData } from '../helpers'
import type { EnemyTemplate, EnemyData } from '../../src/types/data'
import type { EnemyState } from '../../src/types/state'

afterEach(() => vi.restoreAllMocks())

const guardTemplate: EnemyTemplate = {
  id: 'guard',
  type: 'guard',
  stats: { strength: 3, agility: 3, health: 1 },
  detectionRadius: 1,
  canBeBluffed: true,
  canBeDisguised: true,
}

const guardData: EnemyData = {
  id: 'guard_1',
  name: 'Boris',
  templateId: 'guard',
  roomId: 'room_b',
  inventory: [],
}

const twoRooms = {
  room_a: makeRoom({ id: 'room_a', exits: [{ destinationId: 'room_b', label: 'go east' }] }),
  room_b: makeRoom({ id: 'room_b' }),
}

const baseData = makeGameData({
  roomIndex: twoRooms,
  enemyTemplates: { guard: guardTemplate },
  enemyData: { guard_1: guardData },
})

function stateWithGuard(es: Partial<EnemyState> & { status: EnemyState['status'] }, health = 10) {
  const guard: EnemyState = { id: 'guard_1', inventory: [], ...es }
  return makeState({
    protagonist: health !== 10 ? { ...makeState().protagonist, health } : makeState().protagonist,
    roomStates: {
      room_a: makeRoomState({ id: 'room_a' }),
      room_b: makeRoomState({ id: 'room_b' }),
    },
    enemyStates: { guard_1: guard },
  })
}

const baseState = stateWithGuard({ status: 'active', awareness: 'alert' })

describe('alert guard ambush on move', () => {
  it('attacks when Jacob enters a room with an alert guard', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99) // max roll → always hit

    const result = processAction({ type: 'move', exitLabel: 'go east' }, baseState, baseData)

    expect(result.messages.some((m) => /attacks/i.test(m))).toBe(true)
  })

  it('deals 1 damage on a hit', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)

    const result = processAction({ type: 'move', exitLabel: 'go east' }, baseState, baseData)

    expect(result.state.protagonist.health).toBe(9)
  })

  it('reports a miss when attack roll fails', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // min roll → always miss

    const result = processAction({ type: 'move', exitLabel: 'go east' }, baseState, baseData)

    expect(result.state.protagonist.health).toBe(10)
    expect(result.messages.some((m) => /misses/i.test(m))).toBe(true)
  })

  it('does not ambush for an unaware guard', () => {
    const state = stateWithGuard({ status: 'active', awareness: 'unaware' })
    const result = processAction({ type: 'move', exitLabel: 'go east' }, state, baseData)

    expect(result.state.protagonist.health).toBe(10)
    expect(result.messages.some((m) => /attacks/i.test(m))).toBe(false)
  })

  it('does not ambush for a suspicious guard', () => {
    const state = stateWithGuard({ status: 'active', awareness: 'suspicious' })
    const result = processAction({ type: 'move', exitLabel: 'go east' }, state, baseData)

    expect(result.state.protagonist.health).toBe(10)
  })

  it('does not ambush from an unconscious guard', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const state = stateWithGuard({ status: 'unconscious', unconsciousUntil: 999, awareness: 'alert' })
    const result = processAction({ type: 'move', exitLabel: 'go east' }, state, baseData)

    expect(result.state.protagonist.health).toBe(10)
  })

  it('does not ambush a guard in a different room', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const data = makeGameData({
      roomIndex: twoRooms,
      enemyTemplates: { guard: guardTemplate },
      enemyData: { guard_1: { ...guardData, roomId: 'room_a' } },
    })
    const result = processAction({ type: 'move', exitLabel: 'go east' }, baseState, data)

    expect(result.state.protagonist.health).toBe(10)
  })

  it('triggers gameOver:dead if the ambush kills Jacob', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const state = stateWithGuard({ status: 'active', awareness: 'alert' }, 1)
    const result = processAction({ type: 'move', exitLabel: 'go east' }, state, baseData)

    expect(result.gameOver).toBe('dead')
  })

  it('does not trigger ambush when move is rejected', () => {
    const result = processAction({ type: 'move', exitLabel: 'go west' }, baseState, baseData)

    // Still in room_a, no hit
    expect(result.state.protagonist.currentRoom).toBe('room_a')
    expect(result.state.protagonist.health).toBe(10)
  })
})
