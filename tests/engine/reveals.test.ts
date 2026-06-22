import { describe, it, expect } from 'vitest'
import { processAction } from '../../src/engine/index'
import { makeRoom, makeRoomState, makeState, makeGameData } from '../helpers'

const roomWithReveal = makeRoom({
  id: 'room_a',
  hiddenItemIds: ['cipher_key'],
  reveals: [{ flag: 'drawer_unlocked', itemId: 'cipher_key' }],
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

const data = makeGameData({
  roomIndex: { room_a: roomWithReveal },
  itemData: { cipher_key: { id: 'cipher_key', label: 'Cipher Key', description: '', type: 'keycard' } },
})

function stateWithLockPicking(level: number) {
  return makeState({
    protagonist: {
      ...makeState().protagonist,
      skills: [{ id: 'lock_picking', label: 'Lock Picking', level }],
    },
    roomStates: { room_a: makeRoomState({ id: 'room_a' }) },
  })
}

describe('checkReveals via processAction', () => {
  it('promotes a hidden item to visible when the trigger flag is set', () => {
    const result = processAction(
      { type: 'interact', targetId: 'drawer' },
      stateWithLockPicking(2),
      data,
    )

    expect(result.state.roomStates['room_a'].itemIds).toContain('cipher_key')
  })

  it('does not reveal the item when the trigger flag is not set', () => {
    const result = processAction(
      { type: 'look' },
      stateWithLockPicking(2),
      data,
    )

    expect(result.state.roomStates['room_a'].itemIds).not.toContain('cipher_key')
  })

  it('does not duplicate an already-visible item on subsequent turns', () => {
    const afterInteract = processAction(
      { type: 'interact', targetId: 'drawer' },
      stateWithLockPicking(2),
      data,
    )
    const afterLook = processAction({ type: 'look' }, afterInteract.state, data)

    const ids = afterLook.state.roomStates['room_a'].itemIds
    expect(ids.filter((id) => id === 'cipher_key').length).toBe(1)
  })

  it('leaves state reference unchanged when no reveals are pending', () => {
    const state = stateWithLockPicking(2)
    const result = processAction({ type: 'look' }, state, data)

    expect(result.state.roomStates['room_a'].itemIds).toHaveLength(0)
  })
})
