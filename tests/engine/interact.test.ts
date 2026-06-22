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

describe('set_global_flag_if', () => {
  const conditionalRoom = makeRoom({
    id: 'room_a',
    examineTargets: [
      {
        id: 'extraction_vehicle',
        label: 'the car',
        description: 'A black Volga.',
        interactLabel: 'Get in',
        effect: [
          {
            type: 'set_global_flag_if',
            condition: 'machine_photographed',
            flag: 'mission_complete',
            else_flag: 'mission_failed',
          },
        ],
      },
    ],
  })
  const conditionalData = makeGameData({ roomIndex: { room_a: conditionalRoom } })

  it('sets the success flag when condition is true', () => {
    const state = makeState({
      flags: { machine_photographed: true },
      roomStates: { room_a: makeRoomState() },
    })
    const result = handleInteract('extraction_vehicle', state, conditionalData)

    expect(result.state.flags['mission_complete']).toBe(true)
    expect(result.state.flags['mission_failed']).toBeFalsy()
  })

  it('sets the failure flag when condition is false', () => {
    const state = makeState({ roomStates: { room_a: makeRoomState() } })
    const result = handleInteract('extraction_vehicle', state, conditionalData)

    expect(result.state.flags['mission_failed']).toBe(true)
    expect(result.state.flags['mission_complete']).toBeFalsy()
  })

  it('emits a failure message when condition is false', () => {
    const state = makeState({ roomStates: { room_a: makeRoomState() } })
    const result = handleInteract('extraction_vehicle', state, conditionalData)

    expect(result.messages[0]).toMatch(/left without the photographs/i)
  })

  it('emits a success message when condition is true', () => {
    const state = makeState({
      flags: { machine_photographed: true },
      roomStates: { room_a: makeRoomState() },
    })
    const result = handleInteract('extraction_vehicle', state, conditionalData)

    expect(result.messages[0]).toMatch(/download complete/i)
  })
})

describe('gameOver states via checkDeadlines', () => {
  it('returns gameOver success when mission_complete is set', async () => {
    const { processAction } = await import('../../src/engine/index')
    const state = makeState({
      flags: { mission_complete: true },
      roomStates: { room_a: makeRoomState() },
    })
    const result = processAction({ type: 'look' }, state, data)

    expect(result.gameOver).toBe('success')
  })

  it('returns gameOver failed when mission_failed is set', async () => {
    const { processAction } = await import('../../src/engine/index')
    const state = makeState({
      flags: { mission_failed: true },
      roomStates: { room_a: makeRoomState() },
    })
    const result = processAction({ type: 'look' }, state, data)

    expect(result.gameOver).toBe('failed')
  })

  it('success takes priority over failed if both flags are set', async () => {
    const { processAction } = await import('../../src/engine/index')
    const state = makeState({
      flags: { mission_complete: true, mission_failed: true },
      roomStates: { room_a: makeRoomState() },
    })
    const result = processAction({ type: 'look' }, state, data)

    expect(result.gameOver).toBe('success')
  })
})

describe('deadline behaviour', () => {
  it('raises alarm and alerts all guards when deadline is reached', async () => {
    const { processAction } = await import('../../src/engine/index')
    const guardData = makeGameData({
      roomIndex: { room_a: makeRoom({ id: 'room_a' }) },
      enemyTemplates: {
        guard: {
          id: 'guard', type: 'guard',
          stats: { strength: 3, agility: 3, health: 1 },
          detectionRadius: 1, canBeBluffed: true, canBeDisguised: true,
        },
      },
      enemyData: {
        g1: { id: 'g1', name: 'Boris', templateId: 'guard', roomId: 'room_a', inventory: [] },
      },
    })
    const state = makeState({
      time: { elapsed: 100, missionDeadline: 100 },
      roomStates: { room_a: makeRoomState() },
    })
    const result = processAction({ type: 'look' }, state, guardData)

    expect(result.state.flags['alarm_raised']).toBe(true)
    expect(result.state.flags['deadline_passed']).toBe(true)
    expect(result.state.enemyStates['g1']?.awareness).toBe('alert')
    expect(result.gameOver).toBeUndefined()
  })

  it('emits a narrative message when the deadline fires', async () => {
    const { processAction } = await import('../../src/engine/index')
    const state = makeState({
      time: { elapsed: 100, missionDeadline: 100 },
      roomStates: { room_a: makeRoomState() },
    })
    const result = processAction({ type: 'look' }, state, data)

    expect(result.messages.some((m) => /cipher officer/i.test(m))).toBe(true)
  })

  it('does not re-trigger on subsequent turns', async () => {
    const { processAction } = await import('../../src/engine/index')
    const state = makeState({
      time: { elapsed: 105, missionDeadline: 100 },
      flags: { deadline_passed: true },
      roomStates: { room_a: makeRoomState() },
    })
    const result = processAction({ type: 'look' }, state, data)

    expect(result.messages.some((m) => /cipher officer/i.test(m))).toBe(false)
    expect(result.gameOver).toBeUndefined()
  })
})
