import { describe, it, expect } from 'vitest'
import { handleUse } from '../../src/engine/use'
import { emptyInventory, makeRoomState, makeState, makeItemsData } from '../helpers'

const makeData = makeItemsData

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
        inventory: { ...emptyInventory(), small: ['health_kit', null, null] },
      },
      roomStates: { room_a: makeRoomState({ id: 'room_a' }) },
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
        health: 5,
        inventory: { ...emptyInventory(), small: ['health_kit', null, null] },
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
        inventory: { ...emptyInventory(), gadgets: ['distractor', null] },
      },
      roomStates: { room_a: makeRoomState({ id: 'room_a' }) },
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
        inventory: { ...emptyInventory(), gadgets: ['jammer', null] },
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
        inventory: { ...emptyInventory(), gadgets: ['plain_gadget', null] },
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
        inventory: { ...emptyInventory(), special: 'jammer' },
      },
    })
    const data = makeData([jammer])

    const result = handleUse('jammer', state, data)

    expect(result.state.flags['cameras_disabled']).toBe(true)
  })
})
