import { describe, it, expect } from 'vitest'
import { startPursuit, advancePursuit } from '../../src/engine/pursuit'
import { nextStepToward, roomDistance } from '../../src/engine/graph'
import { processAction } from '../../src/engine/index'
import type { EnemyData, EnemyTemplate, RoomData } from '../../src/types/data'
import { makeState, makeRoom, makeRoomState, makeGameData } from '../helpers'

const makeTemplate = (partial: Partial<EnemyTemplate> = {}): EnemyTemplate => {
  const { stats: partialStats, ...rest } = partial
  return {
    id: 'guard',
    type: 'guard',
    stats: { strength: 3, agility: 0, health: 1, intelligence: 2, ...partialStats },
    detectionRadius: 1,
    canBeBluffed: false,
    canBeDisguised: false,
    canPursue: true,
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

// Linear chain: a <-> b <-> c <-> d
function chain(): RoomData[] {
  const a = makeRoom({ id: 'room_a', exits: [{ destinationId: 'room_b', label: 'go to b' }] })
  const b = makeRoom({
    id: 'room_b',
    exits: [
      { destinationId: 'room_a', label: 'go to a' },
      { destinationId: 'room_c', label: 'go to c' },
    ],
  })
  const c = makeRoom({
    id: 'room_c',
    exits: [
      { destinationId: 'room_b', label: 'go to b' },
      { destinationId: 'room_d', label: 'go to d' },
    ],
  })
  const d = makeRoom({ id: 'room_d', exits: [{ destinationId: 'room_c', label: 'go to c' }] })
  return [a, b, c, d]
}

const chainData = (enemyData: Record<string, EnemyData> = {}) =>
  makeGameData({
    roomIndex: Object.fromEntries(chain().map((r) => [r.id, r])),
    enemyTemplates: { guard: makeTemplate() },
    enemyData,
  })

describe('graph — nextStepToward / roomDistance', () => {
  const rooms = Object.fromEntries(chain().map((r) => [r.id, r]))

  it('returns the first hop toward a distant room', () => {
    expect(nextStepToward('room_a', 'room_d', rooms)).toBe('room_b')
  })

  it('returns null when already at the destination', () => {
    expect(nextStepToward('room_a', 'room_a', rooms)).toBeNull()
  })

  it('returns null when unreachable', () => {
    const isolated = { ...rooms, room_e: makeRoom({ id: 'room_e' }) }
    expect(nextStepToward('room_a', 'room_e', isolated)).toBeNull()
  })

  it('roomDistance counts hops', () => {
    expect(roomDistance('room_a', 'room_d', rooms)).toBe(3)
  })
})

describe('startPursuit', () => {
  it('starts pursuit for an alert, pursuit-capable guard left behind', () => {
    const data = chainData({ g1: makeGuard() })
    const state = makeState({
      enemyStates: { g1: { id: 'g1', status: 'active', awareness: 'alert', inventory: [] } },
    })
    const result = startPursuit(state, data, 'room_a', 'room_b')
    expect(result.state.enemyStates['g1']?.pursuit).toEqual({ roomId: 'room_a', turnsWithoutContact: 0 })
    expect(result.messages[0]).toMatch(/gives chase/i)
  })

  it('does not start pursuit for a merely suspicious guard', () => {
    const data = chainData({ g1: makeGuard() })
    const state = makeState({
      enemyStates: { g1: { id: 'g1', status: 'active', awareness: 'suspicious', inventory: [] } },
    })
    const result = startPursuit(state, data, 'room_a', 'room_b')
    expect(result.state).toBe(state)
  })

  it('does not start pursuit when the template disallows it', () => {
    const data = makeGameData({
      roomIndex: Object.fromEntries(chain().map((r) => [r.id, r])),
      enemyTemplates: { guard: makeTemplate({ canPursue: false }) },
      enemyData: { g1: makeGuard() },
    })
    const state = makeState({
      enemyStates: { g1: { id: 'g1', status: 'active', awareness: 'alert', inventory: [] } },
    })
    const result = startPursuit(state, data, 'room_a', 'room_b')
    expect(result.state).toBe(state)
  })

  it('does not restart an already-pursuing guard', () => {
    const data = chainData({ g1: makeGuard() })
    const state = makeState({
      enemyStates: {
        g1: {
          id: 'g1',
          status: 'active',
          awareness: 'alert',
          inventory: [],
          pursuit: { roomId: 'room_c', turnsWithoutContact: 1 },
        },
      },
    })
    const result = startPursuit(state, data, 'room_a', 'room_b')
    expect(result.state).toBe(state)
  })

  it('is a no-op when the room did not actually change', () => {
    const data = chainData({ g1: makeGuard() })
    const state = makeState({
      enemyStates: { g1: { id: 'g1', status: 'active', awareness: 'alert', inventory: [] } },
    })
    const result = startPursuit(state, data, 'room_a', 'room_a')
    expect(result.state).toBe(state)
  })
})

describe('advancePursuit', () => {
  it('closes a one-hop gap and regains contact', () => {
    const data = chainData({ g1: makeGuard() })
    const state = makeState({
      protagonist: { currentRoom: 'room_c' } as never,
      enemyStates: {
        g1: {
          id: 'g1',
          status: 'active',
          awareness: 'alert',
          inventory: [],
          pursuit: { roomId: 'room_b', turnsWithoutContact: 1 },
        },
      },
    })
    const result = advancePursuit(state, data)
    expect(result.state.enemyStates['g1']?.pursuit).toEqual({ roomId: 'room_c', turnsWithoutContact: 0 })
    expect(result.messages[0]).toMatch(/right behind you/i)
  })

  it('holds position without churn when already co-located', () => {
    const data = chainData({ g1: makeGuard() })
    const state = makeState({
      protagonist: { currentRoom: 'room_b' } as never,
      enemyStates: {
        g1: {
          id: 'g1',
          status: 'active',
          awareness: 'alert',
          inventory: [],
          pursuit: { roomId: 'room_b', turnsWithoutContact: 0 },
        },
      },
    })
    const result = advancePursuit(state, data)
    expect(result.state).toBe(state)
  })

  it('steps closer without reaching Jacob when still two or more rooms away', () => {
    const data = chainData({ g1: makeGuard() })
    const state = makeState({
      protagonist: { currentRoom: 'room_d' } as never,
      enemyStates: {
        g1: {
          id: 'g1',
          status: 'active',
          awareness: 'alert',
          inventory: [],
          pursuit: { roomId: 'room_a', turnsWithoutContact: 0 },
        },
      },
    })
    const result = advancePursuit(state, data)
    expect(result.state.enemyStates['g1']?.pursuit).toEqual({ roomId: 'room_b', turnsWithoutContact: 1 })
    expect(result.messages).toHaveLength(0)
  })

  it('gives up after repeatedly failing to close a multi-room gap', () => {
    // Jacob teleports out of reach each call (simulating a guard that can never catch up),
    // so the two-or-more-rooms-away branch keeps incrementing turnsWithoutContact.
    const data = makeGameData({
      roomIndex: Object.fromEntries(chain().map((r) => [r.id, r])),
      enemyTemplates: { guard: makeTemplate({ pursuitGiveUpTurns: 2 }) },
      enemyData: { g1: makeGuard() },
    })
    let state = makeState({
      protagonist: { currentRoom: 'room_d' } as never,
      enemyStates: {
        g1: {
          id: 'g1',
          status: 'active',
          awareness: 'alert',
          inventory: [],
          pursuit: { roomId: 'room_a', turnsWithoutContact: 0 },
        },
      },
    })
    state = advancePursuit(state, data).state // room_a -> room_b, turnsWithoutContact 1
    const result = advancePursuit(state, data) // still 2 rooms from room_d -> gives up
    expect(result.state.enemyStates['g1']?.pursuit).toBeUndefined()
    expect(result.state.enemyStates['g1']?.awareness).toBe('suspicious')
    expect(result.messages[0]).toMatch(/loses your trail/i)
  })

  it('gives up immediately when the target room is unreachable', () => {
    const roomA = makeRoom({ id: 'room_a' })
    const roomE = makeRoom({ id: 'room_e' }) // no connecting exits
    const data = makeGameData({
      roomIndex: { room_a: roomA, room_e: roomE },
      enemyTemplates: { guard: makeTemplate() },
      enemyData: { g1: makeGuard() },
    })
    const state = makeState({
      protagonist: { currentRoom: 'room_e' } as never,
      enemyStates: {
        g1: {
          id: 'g1',
          status: 'active',
          awareness: 'alert',
          inventory: [],
          pursuit: { roomId: 'room_a', turnsWithoutContact: 0 },
        },
      },
    })
    const result = advancePursuit(state, data)
    expect(result.state.enemyStates['g1']?.pursuit).toBeUndefined()
    expect(result.state.enemyStates['g1']?.awareness).toBe('suspicious')
  })

  it('ignores a guard who went down mid-chase', () => {
    const data = chainData({ g1: makeGuard() })
    const state = makeState({
      protagonist: { currentRoom: 'room_d' } as never,
      enemyStates: {
        g1: { id: 'g1', status: 'unconscious', inventory: [], pursuit: { roomId: 'room_a', turnsWithoutContact: 0 } },
      },
    })
    const result = advancePursuit(state, data)
    expect(result.state).toBe(state)
  })
})

describe('pursuit — integration via processAction', () => {
  it('fleeing an alert guard triggers pursuit', () => {
    const data = chainData({ g1: makeGuard({ roomId: 'room_b' }) })
    const state = makeState({
      protagonist: { currentRoom: 'room_b', previousRoomId: 'room_a' } as never,
      roomStates: { room_a: makeRoomState({ id: 'room_a' }), room_b: makeRoomState({ id: 'room_b' }) },
      enemyStates: { g1: { id: 'g1', status: 'active', awareness: 'alert', inventory: [] } },
    })
    const result = processAction({ type: 'flee' }, state, data)
    expect(result.state.enemyStates['g1']?.pursuit).toBeTruthy()
    expect(result.messages.some((m) => /gives chase/i.test(m))).toBe(true)
  })

  it('a guard closes the gap and ambushes Jacob the moment he stops moving', () => {
    const data = chainData({ g1: makeGuard({ roomId: 'room_a' }) })
    let state = makeState({
      roomStates: {
        room_a: makeRoomState({ id: 'room_a' }),
        room_b: makeRoomState({ id: 'room_b' }),
      },
      enemyStates: { g1: { id: 'g1', status: 'active', awareness: 'alert', inventory: [] } },
    })

    // Jacob moves away — guard starts pursuing and closes the (one-hop) gap the same turn
    state = processAction({ type: 'move', exitLabel: 'go to b' }, state, data).state
    expect(state.protagonist.currentRoom).toBe('room_b')
    expect(state.enemyStates['g1']?.pursuit?.roomId).toBe('room_b')

    // Jacob stands still (search) — guard is already co-located, so ambush fires
    const result = processAction({ type: 'search' }, state, data)
    expect(result.messages.some((m) => /spots you and attacks/i.test(m))).toBe(true)
  })

  it('a Jacob who keeps moving every turn is never ambushed', () => {
    const data = chainData({ g1: makeGuard({ roomId: 'room_a' }) })
    let state = makeState({
      protagonist: { currentRoom: 'room_a', previousRoomId: null } as never,
      roomStates: {
        room_a: makeRoomState({ id: 'room_a' }),
        room_b: makeRoomState({ id: 'room_b' }),
        room_c: makeRoomState({ id: 'room_c' }),
      },
      enemyStates: { g1: { id: 'g1', status: 'active', awareness: 'alert', inventory: [] } },
    })

    state = processAction({ type: 'move', exitLabel: 'go to b' }, state, data).state
    const afterSecondMove = processAction({ type: 'move', exitLabel: 'go to c' }, state, data)
    expect(afterSecondMove.messages.some((m) => /spots you and attacks/i.test(m))).toBe(false)
    expect(afterSecondMove.state.protagonist.currentRoom).toBe('room_c')
    // The guard still ends the turn co-located — it just never got the chance to swing.
    expect(afterSecondMove.state.enemyStates['g1']?.pursuit?.roomId).toBe('room_c')
  })

  it('a pursuing guard interrupts a search', () => {
    const data = chainData({ g1: makeGuard({ roomId: 'room_a' }) })
    const state = makeState({
      protagonist: { currentRoom: 'room_b' } as never,
      roomStates: { room_a: makeRoomState({ id: 'room_a' }), room_b: makeRoomState({ id: 'room_b' }) },
      enemyStates: {
        g1: {
          id: 'g1',
          status: 'active',
          awareness: 'alert',
          inventory: [],
          pursuit: { roomId: 'room_a', turnsWithoutContact: 0 },
        },
      },
    })
    const result = processAction({ type: 'search' }, state, data)
    expect(result.messages.some((m) => /interrupted/i.test(m))).toBe(true)
  })
})
