import { describe, it, expect, vi } from 'vitest'
import { handleMove } from '../../src/engine/movement'
import { makeRoom, makeState, makeRoomsData } from '../helpers'

const makeData = makeRoomsData

describe('handleMove', () => {
  it('moves to a valid exit', () => {
    const data = makeData([
      makeRoom({ id: 'room_a', exits: [{ destinationId: 'room_b', label: 'go north' }] }),
      makeRoom({ id: 'room_b' }),
    ])
    const result = handleMove('go north', makeState(), data)

    expect(result.state.protagonist.currentRoom).toBe('room_b')
    expect(result.state.protagonist.previousRoomId).toBe('room_a')
  })

  it('marks destination as visited', () => {
    const data = makeData([
      makeRoom({ id: 'room_a', exits: [{ destinationId: 'room_b', label: 'go north' }] }),
      makeRoom({ id: 'room_b' }),
    ])
    const result = handleMove('go north', makeState(), data)

    expect(result.state.roomStates['room_b'].visited).toBe(true)
  })

  it('preserves existing room state on revisit', () => {
    const data = makeData([
      makeRoom({ id: 'room_a', exits: [{ destinationId: 'room_b', label: 'go north' }] }),
      makeRoom({ id: 'room_b' }),
    ])
    const state = makeState({
      roomStates: {
        room_b: {
          id: 'room_b',
          itemIds: ['key'],
          enemyIds: [],
          flags: { lights_on: true },
          visited: true,
        },
      },
    })
    const result = handleMove('go north', state, data)

    expect(result.state.roomStates['room_b'].itemIds).toEqual(['key'])
    expect(result.state.roomStates['room_b'].flags.lights_on).toBe(true)
  })

  it('rejects an unknown exit label', () => {
    const data = makeData([makeRoom({ id: 'room_a' })])
    const result = handleMove('fly away', makeState(), data)

    expect(result.state.protagonist.currentRoom).toBe('room_a')
    expect(result.messages[0]).toMatch(/no exit/i)
  })

  it('routes to fallback room when destination id is missing from map', () => {
    const data = makeData([
      makeRoom({ id: 'room_a', exits: [{ destinationId: 'void', label: 'go north' }] }),
    ])
    const result = handleMove('go north', makeState(), data)

    expect(result.state.protagonist.currentRoom).toBe('__fallback__')
    expect(result.state.protagonist.previousRoomId).toBe('room_a')
  })

  it('blocks a hidden exit that has not been discovered', () => {
    const data = makeData([
      makeRoom({
        id: 'room_a',
        exits: [{ destinationId: 'room_b', label: 'secret door', hidden: true }],
      }),
      makeRoom({ id: 'room_b' }),
    ])
    const result = handleMove('secret door', makeState(), data)

    expect(result.state.protagonist.currentRoom).toBe('room_a')
    expect(result.messages[0]).toMatch(/no exit/i)
  })

  it('allows a hidden exit once discovered', () => {
    const data = makeData([
      makeRoom({
        id: 'room_a',
        exits: [{ destinationId: 'room_b', label: 'secret door', hidden: true }],
      }),
      makeRoom({ id: 'room_b' }),
    ])
    const state = makeState({
      roomStates: {
        room_a: {
          id: 'room_a',
          itemIds: [],
          enemyIds: [],
          flags: { exit_visible_room_b: true },
          visited: true,
        },
      },
    })
    const result = handleMove('secret door', state, data)

    expect(result.state.protagonist.currentRoom).toBe('room_b')
  })

  it('blocks an exit requiring a missing item', () => {
    const data = makeData([
      makeRoom({
        id: 'room_a',
        exits: [{ destinationId: 'room_b', label: 'through the door', requires: { itemId: 'keycard' } }],
      }),
      makeRoom({ id: 'room_b' }),
    ])
    const result = handleMove('through the door', makeState(), data)

    expect(result.state.protagonist.currentRoom).toBe('room_a')
  })

  it('allows an exit when required item is in inventory', () => {
    const data = makeData([
      makeRoom({
        id: 'room_a',
        exits: [{ destinationId: 'room_b', label: 'through the door', requires: { itemId: 'keycard' } }],
      }),
      makeRoom({ id: 'room_b' }),
    ])
    const state = makeState()
    state.protagonist.inventory.small[0] = 'keycard'
    const result = handleMove('through the door', state, data)

    expect(result.state.protagonist.currentRoom).toBe('room_b')
  })

  it('blocks an exit requiring a skill the protagonist lacks', () => {
    const data = makeData([
      makeRoom({
        id: 'room_a',
        exits: [{ destinationId: 'room_b', label: 'climb the shaft', requires: { skillId: 'acrobatics', skillLevel: 3 } }],
      }),
      makeRoom({ id: 'room_b' }),
    ])
    const result = handleMove('climb the shaft', makeState(), data)

    expect(result.state.protagonist.currentRoom).toBe('room_a')
    expect(result.messages[0]).toMatch(/acrobatics/i)
    expect(result.messages[0]).toMatch(/level 3/i)
  })

  it('blocks an exit when protagonist has the skill but below the required level', () => {
    const data = makeData([
      makeRoom({
        id: 'room_a',
        exits: [{ destinationId: 'room_b', label: 'climb the shaft', requires: { skillId: 'acrobatics', skillLevel: 3 } }],
      }),
      makeRoom({ id: 'room_b' }),
    ])
    const state = makeState()
    state.protagonist.skills = [{ id: 'acrobatics', label: 'Acrobatics', level: 2 }]
    const result = handleMove('climb the shaft', state, data)

    expect(result.state.protagonist.currentRoom).toBe('room_a')
    expect(result.messages[0]).toMatch(/acrobatics/i)
    expect(result.messages[0]).toMatch(/level 3/i)
  })

  it('allows an exit when protagonist has sufficient skill level', () => {
    const data = makeData([
      makeRoom({
        id: 'room_a',
        exits: [{ destinationId: 'room_b', label: 'climb the shaft', requires: { skillId: 'acrobatics', skillLevel: 3 } }],
      }),
      makeRoom({ id: 'room_b' }),
    ])
    const state = makeState()
    state.protagonist.skills = [{ id: 'acrobatics', label: 'Acrobatics', level: 3 }]
    const result = handleMove('climb the shaft', state, data)

    expect(result.state.protagonist.currentRoom).toBe('room_b')
  })

  it('names the required item in the failure message', () => {
    const data = {
      ...makeData([
        makeRoom({
          id: 'room_a',
          exits: [{ destinationId: 'room_b', label: 'through the door', requires: { itemId: 'keycard_b' } }],
        }),
        makeRoom({ id: 'room_b' }),
      ]),
      itemData: { keycard_b: { id: 'keycard_b', label: 'Level B Keycard', description: '', type: 'keycard' as const } },
    }
    const result = handleMove('through the door', makeState(), data)

    expect(result.state.protagonist.currentRoom).toBe('room_a')
    expect(result.messages[0]).toMatch(/Level B Keycard/i)
  })

  it('returns no messages on successful move (renderer handles room display)', () => {
    const data = makeData([
      makeRoom({ id: 'room_a', exits: [{ destinationId: 'room_b', label: 'go north' }] }),
      makeRoom({ id: 'room_b', label: 'Server Room', description: 'Racks of equipment hum quietly.' }),
    ])
    const result = handleMove('go north', makeState(), data)

    expect(result.messages).toHaveLength(0)
  })

  it('roll success: moves to destination with no fail message or flag', () => {
    const data = makeData([
      makeRoom({
        id: 'room_a',
        exits: [{
          destinationId: 'room_b',
          label: 'climb',
          roll: { stat: 'agility', skillId: 'acrobatics', dc: 15, failMessage: 'You are spotted.', failFlag: 'alarm_raised' },
        }],
      }),
      makeRoom({ id: 'room_b' }),
    ])
    vi.spyOn(Math, 'random').mockReturnValue(0.99) // rollD20 = 20; 20+5+0 = 25 >= 15
    const result = handleMove('climb', makeState(), data)

    expect(result.state.protagonist.currentRoom).toBe('room_b')
    expect(result.messages).toHaveLength(0)
    expect(result.state.flags['alarm_raised']).toBeFalsy()
  })

  it('roll failure: moves to destination but sets failFlag and appends failMessage', () => {
    const data = makeData([
      makeRoom({
        id: 'room_a',
        exits: [{
          destinationId: 'room_b',
          label: 'climb',
          roll: { stat: 'agility', skillId: 'acrobatics', dc: 15, failMessage: 'You are spotted.', failFlag: 'alarm_raised' },
        }],
      }),
      makeRoom({ id: 'room_b' }),
    ])
    vi.spyOn(Math, 'random').mockReturnValue(0) // rollD20 = 1; 1+5+0 = 6 < 15
    const result = handleMove('climb', makeState(), data)

    expect(result.state.protagonist.currentRoom).toBe('room_b')
    expect(result.messages[0]).toBe('You are spotted.')
    expect(result.state.flags['alarm_raised']).toBe(true)
  })
})
