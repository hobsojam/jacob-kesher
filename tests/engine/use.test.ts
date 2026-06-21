import { describe, it, expect } from 'vitest'
import { handleUse } from '../../src/engine/use'
import type { GameData, ItemData, RoomData } from '../../src/types/data'
import type { GameState, RoomState } from '../../src/types/state'

const makeRoom = (partial: Partial<RoomData> & { id: string }): RoomData => ({
  label: partial.id,
  description: '',
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
    health: 5,
    stats: { strength: 5, agility: 5, intelligence: 5, charisma: 5 },
    skills: [],
    inventory: { weapons: [null, null], gadgets: [null, null], small: [null, null, null], special: null },
    flags: {},
  },
  time: { elapsed: 0, missionDeadline: 100 },
  alarmLevel: 'undetected',
  roomStates: { room_a: makeRoomState({ id: 'room_a' }) },
  enemyStates: {},
  itemStates: {},
  flags: {},
  ...partial,
})

const makeData = (items: ItemData[], rooms: RoomData[] = []): GameData => ({
  roomIndex: Object.fromEntries(rooms.map((r) => [r.id, r])),
  itemData: Object.fromEntries(items.map((i) => [i.id, i])),
  enemyTemplates: {},
  enemyData: {},
})

const healthKit: ItemData = {
  id: 'health_kit',
  label: 'health kit',
  description: 'A field medkit.',
  type: 'consumable',
  effect: { type: 'heal', amount: 3 },
}

const distractor: ItemData = {
  id: 'distractor',
  label: 'distraction device',
  description: 'Makes noise in another room.',
  type: 'gadget',
  effect: { type: 'set_room_flag', flag: 'distracted' },
}

const jammer: ItemData = {
  id: 'jammer',
  label: 'camera jammer',
  description: 'Disables cameras.',
  type: 'gadget',
  effect: { type: 'set_global_flag', flag: 'cameras_disabled' },
}

const plainGadget: ItemData = {
  id: 'plain_gadget',
  label: 'mysterious gadget',
  description: 'Purpose unknown.',
  type: 'gadget',
}

describe('handleUse — heal', () => {
  it('restores health and marks item used', () => {
    const state = makeState({
      protagonist: {
        ...makeState().protagonist,
        health: 5,
        inventory: { weapons: [null, null], gadgets: [null, null], small: ['health_kit', null, null], special: null },
      },
    })
    const data = makeData([healthKit])

    const result = handleUse('health_kit', state, data)

    expect(result.state.protagonist.health).toBe(8)
    expect(result.state.itemStates['health_kit'].used).toBe(true)
    expect(result.messages[0]).toMatch(/recover 3 health/i)
  })

  it('rejects if already spent', () => {
    const state = makeState({
      protagonist: {
        ...makeState().protagonist,
        inventory: { weapons: [null, null], gadgets: [null, null], small: ['health_kit', null, null], special: null },
      },
      itemStates: { health_kit: { id: 'health_kit', used: true, broken: false } },
    })
    const data = makeData([healthKit])

    const result = handleUse('health_kit', state, data)

    expect(result.messages[0]).toMatch(/already spent/i)
    expect(result.state.protagonist.health).toBe(5)
  })
})

describe('handleUse — set_room_flag', () => {
  it('sets the room flag and marks item used', () => {
    const state = makeState({
      protagonist: {
        ...makeState().protagonist,
        inventory: { weapons: [null, null], gadgets: ['distractor', null], small: [null, null, null], special: null },
      },
    })
    const data = makeData([distractor])

    const result = handleUse('distractor', state, data)

    expect(result.state.roomStates['room_a'].flags['distracted']).toBe(true)
    expect(result.state.itemStates['distractor'].used).toBe(true)
  })
})

describe('handleUse — set_global_flag', () => {
  it('sets the global flag and marks item used', () => {
    const state = makeState({
      protagonist: {
        ...makeState().protagonist,
        inventory: { weapons: [null, null], gadgets: ['jammer', null], small: [null, null, null], special: null },
      },
    })
    const data = makeData([jammer])

    const result = handleUse('jammer', state, data)

    expect(result.state.flags['cameras_disabled']).toBe(true)
    expect(result.state.itemStates['jammer'].used).toBe(true)
  })
})

describe('handleUse — edge cases', () => {
  it('rejects item not in inventory', () => {
    const state = makeState()
    const data = makeData([healthKit])

    const result = handleUse('health_kit', state, data)

    expect(result.messages[0]).toMatch(/don't have that/i)
  })

  it('rejects unknown item id', () => {
    const state = makeState()
    const data = makeData([])

    const result = handleUse('unknown', state, data)

    expect(result.messages[0]).toMatch(/don't have that/i)
  })

  it('reports nothing when item has no effect', () => {
    const state = makeState({
      protagonist: {
        ...makeState().protagonist,
        inventory: { weapons: [null, null], gadgets: ['plain_gadget', null], small: [null, null, null], special: null },
      },
    })
    const data = makeData([plainGadget])

    const result = handleUse('plain_gadget', state, data)

    expect(result.messages[0]).toMatch(/nothing happens/i)
  })

  it('item in special slot is usable', () => {
    const state = makeState({
      protagonist: {
        ...makeState().protagonist,
        inventory: { weapons: [null, null], gadgets: [null, null], small: [null, null, null], special: 'jammer' },
      },
    })
    const data = makeData([jammer])

    const result = handleUse('jammer', state, data)

    expect(result.state.flags['cameras_disabled']).toBe(true)
  })
})
