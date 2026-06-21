import { describe, it, expect } from 'vitest'
import { handleExamine } from '../../src/engine/examine'
import type { GameData, RoomData } from '../../src/types/data'
import type { GameState } from '../../src/types/state'

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

describe('handleExamine', () => {
  it('returns target description when found', () => {
    const room = makeRoom({
      id: 'room_a',
      examineTargets: [{ id: 'filing_cabinet', label: 'the filing cabinet', description: 'Stuffed with documents.' }],
    })
    const state = makeState()
    const data = makeData([room])

    const result = handleExamine('filing_cabinet', state, data)

    expect(result.messages).toContain('Stuffed with documents.')
    expect(result.state).toBe(state)
  })

  it('reports not found when target id does not exist in room', () => {
    const room = makeRoom({ id: 'room_a' })
    const state = makeState()
    const data = makeData([room])

    const result = handleExamine('nonexistent', state, data)

    expect(result.messages[0]).toMatch(/don't see that/i)
  })

  it('reports nothing to examine in unknown room', () => {
    const state = makeState({ protagonist: { ...makeState().protagonist, currentRoom: 'nowhere' } })
    const data = makeData([])

    const result = handleExamine('target', state, data)

    expect(result.messages[0]).toMatch(/nothing to examine/i)
  })

  it('does not mutate state', () => {
    const room = makeRoom({
      id: 'room_a',
      examineTargets: [{ id: 'panel', label: 'the panel', description: 'Blinking lights.' }],
    })
    const state = makeState()
    const data = makeData([room])

    const result = handleExamine('panel', state, data)

    expect(result.state).toBe(state)
  })
})
