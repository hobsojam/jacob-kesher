import { describe, it, expect } from 'vitest'
import { handleLook } from '../../src/engine/look'
import type { GameData, RoomData } from '../../src/types/data'
import type { GameState, RoomState } from '../../src/types/state'

const makeRoom = (partial: Partial<RoomData> & { id: string }): RoomData => ({
  label: partial.id,
  description: `You are in ${partial.id}.`,
  addenda: [],
  exits: [],
  itemIds: [],
  hiddenItemIds: [],
  examineTargets: [],
  ...partial,
})

const makeRoomState = (partial: Partial<RoomState> & { id: string }): RoomState => ({
  itemIds: [],
  enemyIds: [],
  flags: {},
  visited: false,
  ...partial,
})

const makeState = (partial: Partial<GameState> = {}): GameState => ({
  protagonist: {
    currentRoom: 'room_a',
    previousRoomId: null,
    health: 10,
    stats: { strength: 5, agility: 5, intelligence: 5, charisma: 5 },
    skills: [],
    inventory: { weapons: [null, null], gadgets: [null, null], small: [null, null, null], special: null },
    flags: {},
  },
  time: { elapsed: 0, missionDeadline: 100 },
  alarmLevel: 'undetected',
  roomStates: {},
  enemyStates: {},
  itemStates: {},
  flags: {},
  ...partial,
})

const makeData = (rooms: RoomData[]): GameData => ({
  roomIndex: Object.fromEntries(rooms.map((r) => [r.id, r])),
  itemData: {},
  enemyTemplates: {},
  enemyData: {},
})

describe('handleLook', () => {
  it('returns base room description', () => {
    const room = makeRoom({ id: 'room_a', description: 'A dimly lit corridor.' })
    const roomState = makeRoomState({ id: 'room_a' })
    const state = makeState({ roomStates: { room_a: roomState } })
    const data = makeData([room])

    const result = handleLook(state, data)

    expect(result.messages).toContain('A dimly lit corridor.')
    expect(result.messages).toContain('room_a')
  })

  it('appends addenda when flags are set', () => {
    const room = makeRoom({
      id: 'room_a',
      addenda: [{ flag: 'lights_on', text: 'The lights are on.' }],
    })
    const roomState = makeRoomState({ id: 'room_a', flags: { lights_on: true } })
    const state = makeState({ roomStates: { room_a: roomState } })
    const data = makeData([room])

    const result = handleLook(state, data)

    expect(result.messages).toContain('The lights are on.')
  })

  it('does not append addenda when flags are not set', () => {
    const room = makeRoom({
      id: 'room_a',
      addenda: [{ flag: 'lights_on', text: 'The lights are on.' }],
    })
    const roomState = makeRoomState({ id: 'room_a' })
    const state = makeState({ roomStates: { room_a: roomState } })
    const data = makeData([room])

    const result = handleLook(state, data)

    expect(result.messages).not.toContain('The lights are on.')
  })

  it('falls back to fallback room for unknown room', () => {
    const state = makeState({ protagonist: { ...makeState().protagonist, currentRoom: 'nowhere' } })
    const data = makeData([])

    const result = handleLook(state, data)

    expect(result.messages[0]).toBe('Darkness')
  })

  it('does not mutate state', () => {
    const room = makeRoom({ id: 'room_a' })
    const state = makeState({ roomStates: { room_a: makeRoomState({ id: 'room_a' }) } })
    const data = makeData([room])

    const result = handleLook(state, data)

    expect(result.state).toBe(state)
  })
})
