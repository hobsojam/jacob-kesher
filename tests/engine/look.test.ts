import { describe, it, expect } from 'vitest'
import { handleLook } from '../../src/engine/look'
import { makeRoom, makeRoomState, makeState, makeRoomsData } from '../helpers'

const makeData = makeRoomsData

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
    const state = makeState({ roomStates: { room_a: makeRoomState({ id: 'room_a' }) } })
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
