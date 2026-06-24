import { describe, it, expect, vi, afterEach } from 'vitest'
import { handleSearch } from '../../src/engine/search'
import { processAction } from '../../src/engine/index'
import { guardPosition } from '../../src/engine/patrol'
import type { GameData, EnemyTemplate, PatrolRoute } from '../../src/types/data'
import { makeRoom, makeRoomState, makeState, makeGameData } from '../helpers'

const makeData = (partial: Partial<GameData> = {}): GameData =>
  makeGameData({ roomIndex: { room_a: makeRoom({ id: 'room_a' }) }, ...partial })

// --- guardPosition ---

describe('guardPosition', () => {
  const twoRoomPatrol: PatrolRoute = { roomIds: ['room_a', 'room_b'], cycleTime: 4 }

  it('returns the correct room at elapsed 0', () => {
    expect(guardPosition(twoRoomPatrol, 0)).toBe('room_a')
  })

  it('advances to next room mid-cycle', () => {
    expect(guardPosition(twoRoomPatrol, 2)).toBe('room_b')
  })

  it('wraps back to start after full cycle', () => {
    expect(guardPosition(twoRoomPatrol, 4)).toBe('room_a')
  })

  it('applies startOffset to stagger guards', () => {
    const staggered: PatrolRoute = { ...twoRoomPatrol, startOffset: 2 }
    expect(guardPosition(staggered, 0)).toBe('room_b')
    expect(guardPosition(staggered, 2)).toBe('room_a')
  })

  it('handles a single-room patrol', () => {
    const single: PatrolRoute = { roomIds: ['room_a'], cycleTime: 4 }
    expect(guardPosition(single, 0)).toBe('room_a')
    expect(guardPosition(single, 3)).toBe('room_a')
  })

  it('handles four-room patrol correctly', () => {
    const fourRoom: PatrolRoute = {
      roomIds: ['a', 'b', 'c', 'd'],
      cycleTime: 8,
    }
    expect(guardPosition(fourRoom, 0)).toBe('a')
    expect(guardPosition(fourRoom, 2)).toBe('b')
    expect(guardPosition(fourRoom, 4)).toBe('c')
    expect(guardPosition(fourRoom, 6)).toBe('d')
    expect(guardPosition(fourRoom, 8)).toBe('a')
  })
})

// --- handleSearch ---

describe('handleSearch', () => {
  it('reveals hidden items on first search', () => {
    const data = makeData({
      roomIndex: {
        room_a: makeRoom({ id: 'room_a', hiddenItemIds: ['secret_key'] }),
      },
      itemData: { secret_key: { id: 'secret_key', label: 'Secret Key', description: '', type: 'keycard' } },
    })
    const state = makeState({ roomStates: { room_a: makeRoomState() } })
    const result = handleSearch(state, data)

    expect(result.state.roomStates['room_a'].itemIds).toContain('secret_key')
    expect(result.messages.some((m) => /secret key/i.test(m))).toBe(true)
  })

  it('marks room as searched', () => {
    const state = makeState({ roomStates: { room_a: makeRoomState() } })
    const result = handleSearch(state, makeData())

    expect(result.state.roomStates['room_a'].flags['searched']).toBe(true)
  })

  it('finds nothing on second search', () => {
    const state = makeState({
      roomStates: { room_a: makeRoomState({ flags: { searched: true } }) },
    })
    const result = handleSearch(state, makeData())

    expect(result.messages[0]).toMatch(/already searched/i)
  })

  it('reports nothing found when room has no hidden items', () => {
    const state = makeState({ roomStates: { room_a: makeRoomState() } })
    const result = handleSearch(state, makeData())

    expect(result.messages.some((m) => /nothing of interest/i.test(m))).toBe(true)
  })

  it('preserves existing room items when revealing hidden ones', () => {
    const data = makeData({
      roomIndex: { room_a: makeRoom({ id: 'room_a', hiddenItemIds: ['hidden'] }) },
    })
    const state = makeState({
      roomStates: { room_a: makeRoomState({ itemIds: ['visible'] }) },
    })
    const result = handleSearch(state, data)

    expect(result.state.roomStates['room_a'].itemIds).toContain('visible')
    expect(result.state.roomStates['room_a'].itemIds).toContain('hidden')
  })

  it('uses base search cost of 4', () => {
    const state = makeState({ roomStates: { room_a: makeRoomState() } })
    const result = handleSearch(state, makeData())
    expect(result.timeCost).toBe(4)
  })

  it('increases cost with positive searchDifficulty', () => {
    const data = makeData({
      roomIndex: { room_a: makeRoom({ id: 'room_a', searchDifficulty: 3 }) },
    })
    const state = makeState({ roomStates: { room_a: makeRoomState() } })
    const result = handleSearch(state, data)
    expect(result.timeCost).toBe(7)
  })

  it('decreases cost with negative searchDifficulty', () => {
    const data = makeData({
      roomIndex: { room_a: makeRoom({ id: 'room_a', searchDifficulty: -2 }) },
    })
    const state = makeState({ roomStates: { room_a: makeRoomState() } })
    const result = handleSearch(state, data)
    expect(result.timeCost).toBe(2)
  })

  it('clamps search cost to minimum of 1', () => {
    const data = makeData({
      roomIndex: { room_a: makeRoom({ id: 'room_a', searchDifficulty: -10 }) },
    })
    const state = makeState({ roomStates: { room_a: makeRoomState() } })
    const result = handleSearch(state, data)
    expect(result.timeCost).toBe(1)
  })

  it('reports guard interruption when patrol enters room during search', () => {
    const data: GameData = makeGameData({
      roomIndex: { room_a: makeRoom({ id: 'room_a' }) },
      enemyData: {
        guard_1: {
          id: 'guard_1',
          name: 'Boris',
          templateId: 'guard',
          roomId: 'room_b',
          inventory: [],
          patrol: { roomIds: ['room_b', 'room_a'], cycleTime: 4 },
        },
      },
    })
    // At elapsed=0: guard is in room_b. At elapsed=2: guard is in room_a (during search)
    const state = makeState({
      time: { elapsed: 0, missionDeadline: 100 },
      roomStates: { room_a: makeRoomState() },
    })
    const result = handleSearch(state, data)

    expect(result.messages.some((m) => /boris/i.test(m))).toBe(true)
    expect(result.messages.some((m) => /interrupted/i.test(m))).toBe(true)
  })

  it('sets the interrupting guard to alert', () => {
    const data: GameData = makeGameData({
      roomIndex: { room_a: makeRoom({ id: 'room_a' }) },
      enemyData: {
        guard_1: {
          id: 'guard_1',
          name: 'Boris',
          templateId: 'guard',
          roomId: 'room_b',
          inventory: [],
          patrol: { roomIds: ['room_b', 'room_a'], cycleTime: 4 },
        },
      },
    })
    const state = makeState({ roomStates: { room_a: makeRoomState() } })
    const result = handleSearch(state, data)

    expect(result.state.enemyStates['guard_1']?.awareness).toBe('alert')
  })

  it('does not report interruption from unconscious guard', () => {
    const data: GameData = makeGameData({
      roomIndex: { room_a: makeRoom({ id: 'room_a' }) },
      enemyData: {
        guard_1: {
          id: 'guard_1',
          name: 'Boris',
          templateId: 'guard',
          roomId: 'room_b',
          inventory: [],
          patrol: { roomIds: ['room_b', 'room_a'], cycleTime: 4 },
        },
      },
    })
    const state = makeState({
      roomStates: { room_a: makeRoomState() },
      enemyStates: { guard_1: { id: 'guard_1', status: 'unconscious', inventory: [] } },
    })
    const result = handleSearch(state, data)

    expect(result.messages.some((m) => /interrupted/i.test(m))).toBe(false)
    expect(result.state.enemyStates['guard_1']?.awareness).toBeUndefined()
  })

  it('does not report interruption from guard patrolling a different room', () => {
    const data: GameData = makeGameData({
      roomIndex: { room_a: makeRoom({ id: 'room_a' }) },
      enemyData: {
        guard_1: {
          id: 'guard_1',
          name: 'Boris',
          templateId: 'guard',
          roomId: 'room_c',
          inventory: [],
          patrol: { roomIds: ['room_c', 'room_d'], cycleTime: 4 },
        },
      },
    })
    const state = makeState({ roomStates: { room_a: makeRoomState() } })
    const result = handleSearch(state, data)

    expect(result.messages.some((m) => /interrupted/i.test(m))).toBe(false)
  })

  it('sets alarm_raised when a patrol guard interrupts the search', () => {
    const data: GameData = makeGameData({
      roomIndex: { room_a: makeRoom({ id: 'room_a' }) },
      enemyData: {
        guard_1: {
          id: 'guard_1',
          name: 'Boris',
          templateId: 'guard',
          roomId: 'room_b',
          inventory: [],
          patrol: { roomIds: ['room_b', 'room_a'], cycleTime: 4 },
        },
      },
    })
    const state = makeState({ roomStates: { room_a: makeRoomState() } })
    const result = handleSearch(state, data)

    expect(result.state.flags['alarm_raised']).toBe(true)
  })
})

// --- search ambush pipeline (processAction) ---
//
// Fix 3: guardAmbush runs after search, same as after talk. An alert guard
// already in the room gets a free attack on Jacob.

const guardTemplate: EnemyTemplate = {
  id: 'guard',
  type: 'guard',
  stats: { strength: 3, agility: 3, health: 1, intelligence: 2 },
  detectionRadius: 1,
  canBeBluffed: false,
  canBeDisguised: false,
}

const alertGuardData: GameData = makeGameData({
  roomIndex: { room_a: makeRoom({ id: 'room_a' }) },
  enemyTemplates: { guard: guardTemplate },
  enemyData: {
    guard_1: { id: 'guard_1', name: 'Boris', templateId: 'guard', roomId: 'room_a', inventory: [] },
  },
})

describe('search ambush pipeline (processAction)', () => {
  afterEach(() => vi.restoreAllMocks())

  it('alert stationary guard attacks Jacob immediately after search', () => {
    // roll=20 → guard attack = 23 > defence = 13 → hits
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const state = makeState({
      roomStates: { room_a: makeRoomState() },
      enemyStates: { guard_1: { id: 'guard_1', status: 'active', inventory: [], awareness: 'alert' } },
    })
    const result = processAction({ type: 'search' }, state, alertGuardData)

    expect(result.state.protagonist.health).toBeLessThan(state.protagonist.health)
  })

  it('alert stationary guard misses when roll is too low', () => {
    // roll=1 → guard attack = 4 < defence = 13 → misses
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const state = makeState({
      roomStates: { room_a: makeRoomState() },
      enemyStates: { guard_1: { id: 'guard_1', status: 'active', inventory: [], awareness: 'alert' } },
    })
    const result = processAction({ type: 'search' }, state, alertGuardData)

    expect(result.state.protagonist.health).toBe(state.protagonist.health)
  })

  it('unaware guard does not get a free attack during search', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    // guard has no EnemyState entry → defaults to 'unaware'
    const state = makeState({ roomStates: { room_a: makeRoomState() } })
    const result = processAction({ type: 'search' }, state, alertGuardData)

    expect(result.state.protagonist.health).toBe(state.protagonist.health)
  })
})
