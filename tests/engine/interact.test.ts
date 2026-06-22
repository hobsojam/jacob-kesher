import { describe, it, expect } from 'vitest'
import { handleInteract } from '../../src/engine/interact'
import { makeState, makeRoom, makeRoomState, makeGameData } from '../helpers'

const terminalRoom = makeRoom({
  id: 'room_a',
  examineTargets: [
    {
      id: 'terminal',
      label: 'the terminal',
      description: 'A logged-in terminal.',
      interactLabel: 'Download files',
      effect: [
        { type: 'set_room_flag', flag: 'data_downloaded' },
        { type: 'set_global_flag', flag: 'mission_complete' },
      ],
    },
  ],
})

const data = makeGameData({ roomIndex: { room_a: terminalRoom } })

describe('handleInteract', () => {
  it('applies all effects in order', () => {
    const state = makeState({ roomStates: { room_a: makeRoomState() } })
    const result = handleInteract('terminal', state, data)

    expect(result.state.roomStates['room_a'].flags['data_downloaded']).toBe(true)
    expect(result.state.flags['mission_complete']).toBe(true)
  })

  it('emits a message for the mission_complete flag', () => {
    const state = makeState({ roomStates: { room_a: makeRoomState() } })
    const result = handleInteract('terminal', state, data)

    expect(result.messages.some((m) => /download complete/i.test(m))).toBe(true)
  })

  it('returns a message when target has no effect', () => {
    const roomWithInert = makeRoom({
      id: 'room_a',
      examineTargets: [{ id: 'desk', label: 'the desk', description: 'A desk.' }],
    })
    const s = makeState({ roomStates: { room_a: makeRoomState() } })
    const result = handleInteract('desk', s, makeGameData({ roomIndex: { room_a: roomWithInert } }))

    expect(result.messages[0]).toMatch(/nothing happens/i)
    expect(result.state).toBe(s)
  })

  it('returns a message for an unknown target', () => {
    const state = makeState({ roomStates: { room_a: makeRoomState() } })
    const result = handleInteract('nonexistent', state, data)

    expect(result.messages[0]).toMatch(/nothing happens/i)
  })

  it('applies a heal effect', () => {
    const roomWithHeal = makeRoom({
      id: 'room_a',
      examineTargets: [
        { id: 'medkit', label: 'a wall-mounted medkit', description: '', effect: [{ type: 'heal', amount: 2 }] },
      ],
    })
    const state = makeState({ protagonist: { ...makeState().protagonist, health: 7 }, roomStates: { room_a: makeRoomState() } })
    const result = handleInteract('medkit', state, makeGameData({ roomIndex: { room_a: roomWithHeal } }))

    expect(result.state.protagonist.health).toBe(9)
  })

  it('does not mutate state when target is unknown', () => {
    const state = makeState({ roomStates: { room_a: makeRoomState() } })
    const result = handleInteract('missing', state, data)

    expect(result.state).toBe(state)
  })
})

describe('win condition via checkDeadlines', () => {
  it('processAction returns gameOver success when mission_complete is set', async () => {
    const { processAction } = await import('../../src/engine/index')
    const state = makeState({
      flags: { mission_complete: true },
      roomStates: { room_a: makeRoomState() },
    })
    const result = processAction({ type: 'look' }, state, data)

    expect(result.gameOver).toBe('success')
  })
})
