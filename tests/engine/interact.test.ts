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

describe('handleInteract — interactRequires item', () => {
  const cabinet = makeRoom({
    id: 'room_a',
    examineTargets: [
      {
        id: 'cabinet',
        label: 'the cabinet',
        description: 'A locked cabinet.',
        interactLabel: 'Unlock',
        interactRequires: { itemId: 'maint_key' },
        effect: [{ type: 'set_room_flag', flag: 'cabinet_open' }],
      },
    ],
  })
  const cabinetData = makeGameData({
    roomIndex: { room_a: cabinet },
    itemData: { maint_key: { id: 'maint_key', label: 'Maintenance Key', description: '', type: 'keycard' } },
  })

  it('blocks the interact when the required item is not in inventory', () => {
    const state = makeState({ roomStates: { room_a: makeRoomState() } })
    const result = handleInteract('cabinet', state, cabinetData)

    expect(result.state.roomStates['room_a']?.flags['cabinet_open']).toBeFalsy()
    expect(result.messages[0]).toMatch(/maintenance key/i)
  })

  it('allows the interact when the required item is in inventory', () => {
    const state = makeState({
      protagonist: {
        ...makeState().protagonist,
        inventory: {
          weapons: [null, null],
          gadgets: [null, null],
          small: ['maint_key', null, null],
          special: null,
        },
      },
      roomStates: { room_a: makeRoomState() },
    })
    const result = handleInteract('cabinet', state, cabinetData)

    expect(result.state.roomStates['room_a'].flags['cabinet_open']).toBe(true)
  })
})

describe('handleInteract — interactRequires skill', () => {
  const drawer = makeRoom({
    id: 'room_a',
    examineTargets: [
      {
        id: 'drawer',
        label: 'the drawer',
        description: 'A locked drawer.',
        interactLabel: 'Pick the lock',
        interactRequires: { skillId: 'lock_picking', skillLevel: 2 },
        effect: [{ type: 'set_room_flag', flag: 'drawer_unlocked' }],
      },
    ],
  })
  const drawerData = makeGameData({ roomIndex: { room_a: drawer } })

  it('blocks the interact when the skill level is below the threshold', () => {
    const state = makeState({
      protagonist: {
        ...makeState().protagonist,
        skills: [{ id: 'lock_picking', label: 'Lock Picking', level: 1 }],
      },
      roomStates: { room_a: makeRoomState() },
    })
    const result = handleInteract('drawer', state, drawerData)

    expect(result.state.roomStates['room_a']?.flags['drawer_unlocked']).toBeFalsy()
    expect(result.messages[0]).toMatch(/lock picking.*high enough/i)
  })

  it('blocks when the skill is absent entirely', () => {
    const state = makeState({ roomStates: { room_a: makeRoomState() } })
    const result = handleInteract('drawer', state, drawerData)

    expect(result.messages[0]).toMatch(/lock picking.*high enough/i)
  })

  it('allows the interact when the skill level meets the threshold', () => {
    const state = makeState({
      protagonist: {
        ...makeState().protagonist,
        skills: [{ id: 'lock_picking', label: 'Lock Picking', level: 2 }],
      },
      roomStates: { room_a: makeRoomState() },
    })
    const result = handleInteract('drawer', state, drawerData)

    expect(result.state.roomStates['room_a'].flags['drawer_unlocked']).toBe(true)
  })

  it('allows the interact when the skill level exceeds the threshold', () => {
    const state = makeState({
      protagonist: {
        ...makeState().protagonist,
        skills: [{ id: 'lock_picking', label: 'Lock Picking', level: 5 }],
      },
      roomStates: { room_a: makeRoomState() },
    })
    const result = handleInteract('drawer', state, drawerData)

    expect(result.state.roomStates['room_a'].flags['drawer_unlocked']).toBe(true)
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
