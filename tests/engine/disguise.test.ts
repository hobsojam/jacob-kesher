import { describe, it, expect, vi } from 'vitest'
import { checkDisguise } from '../../src/engine/disguise'
import { makeState, makeGameData, makeTemplate } from '../helpers'
import type { EnemyData } from '../../src/types/data'

const makeEnemy = (partial: Partial<EnemyData> & { id: string }): EnemyData => ({
  name: 'Guard',
  templateId: 'guard',
  roomId: 'room_a',
  inventory: [],
  ...partial,
})

describe('checkDisguise', () => {
  it('does nothing when wearing_uniform flag is not set', () => {
    const data = makeGameData({
      enemyData: { guard_1: makeEnemy({ id: 'guard_1' }) },
      enemyTemplates: { guard: makeTemplate({ id: 'guard' }) },
    })
    const result = checkDisguise(makeState(), data)

    expect(result.messages).toHaveLength(0)
    expect(result.state).toBe(result.state)
  })

  it('success: guard in same room accepts disguise, awareness stays unaware', () => {
    const state = makeState({ flags: { wearing_uniform: true } })
    const data = makeGameData({
      enemyData: { guard_1: makeEnemy({ id: 'guard_1' }) },
      enemyTemplates: { guard: makeTemplate({ id: 'guard' }) },
    })
    vi.spyOn(Math, 'random').mockReturnValue(0.99) // max roll → always succeeds

    const result = checkDisguise(state, data)

    expect(result.messages).toHaveLength(0)
    expect(result.state.flags['wearing_uniform']).toBe(true)
    expect(result.state.enemyStates['guard_1']?.awareness ?? 'unaware').toBe('unaware')
  })

  it('success: resets a suspicious guard to unaware', () => {
    const state = makeState({
      flags: { wearing_uniform: true },
      enemyStates: {
        guard_1: { id: 'guard_1', status: 'active', inventory: [], awareness: 'suspicious' },
      },
    })
    const data = makeGameData({
      enemyData: { guard_1: makeEnemy({ id: 'guard_1' }) },
      enemyTemplates: { guard: makeTemplate({ id: 'guard' }) },
    })
    vi.spyOn(Math, 'random').mockReturnValue(0.99)

    const result = checkDisguise(state, data)

    expect(result.state.enemyStates['guard_1'].awareness).toBe('unaware')
    expect(result.state.flags['wearing_uniform']).toBe(true)
  })

  it('failure: sets guard to alert, clears wearing_uniform, appends message', () => {
    // Jacob: charisma 5, no disguise skill → d20(1) + 5 = 6 < DC 12
    const state = makeState({ flags: { wearing_uniform: true } })
    const data = makeGameData({
      enemyData: { guard_1: makeEnemy({ id: 'guard_1' }) },
      enemyTemplates: { guard: makeTemplate({ id: 'guard' }) },
    })
    vi.spyOn(Math, 'random').mockReturnValue(0) // min roll → always fails

    const result = checkDisguise(state, data)

    expect(result.state.enemyStates['guard_1'].awareness).toBe('alert')
    expect(result.state.flags['wearing_uniform']).toBe(false)
    expect(result.messages[0]).toMatch(/cover is blown/i)
  })

  it('ignores guards in a different room', () => {
    const state = makeState({ flags: { wearing_uniform: true } })
    const data = makeGameData({
      enemyData: { guard_1: makeEnemy({ id: 'guard_1', roomId: 'room_b' }) },
      enemyTemplates: { guard: makeTemplate({ id: 'guard' }) },
    })
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const result = checkDisguise(state, data)

    expect(result.messages).toHaveLength(0)
    expect(result.state.flags['wearing_uniform']).toBe(true)
  })

  it('ignores downed guards', () => {
    const state = makeState({
      flags: { wearing_uniform: true },
      enemyStates: {
        guard_1: { id: 'guard_1', status: 'unconscious', inventory: [] },
      },
    })
    const data = makeGameData({
      enemyData: { guard_1: makeEnemy({ id: 'guard_1' }) },
      enemyTemplates: { guard: makeTemplate({ id: 'guard' }) },
    })
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const result = checkDisguise(state, data)

    expect(result.messages).toHaveLength(0)
    expect(result.state.flags['wearing_uniform']).toBe(true)
  })

  it('skips canBeDisguised: false enemies entirely', () => {
    const state = makeState({ flags: { wearing_uniform: true } })
    const data = makeGameData({
      enemyData: { guard_1: makeEnemy({ id: 'guard_1' }) },
      enemyTemplates: { guard: makeTemplate({ id: 'guard', canBeDisguised: false }) },
    })
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const result = checkDisguise(state, data)

    expect(result.messages).toHaveLength(0)
    expect(result.state.flags['wearing_uniform']).toBe(true)
  })

  it('disguise skill level adds to the roll', () => {
    // charisma 5 + disguise 2 → d20(1) + 7 = 8; DC = 10 + 2 = 12 → still fails
    // but with disguise 10 → d20(1) + 15 = 16 ≥ 12 → succeeds
    const state = makeState({
      flags: { wearing_uniform: true },
      protagonist: {
        currentRoom: 'room_a',
        previousRoomId: null,
        health: 10,
        maxHealth: 10,
        stats: { strength: 5, agility: 5, intelligence: 5, charisma: 5 },
        skills: [{ id: 'disguise', label: 'Disguise', level: 10 }],
        inventory: { weapons: [null, null], gadgets: [null, null], small: [null, null, null], special: null },
        flags: {},
      },
    })
    const data = makeGameData({
      enemyData: { guard_1: makeEnemy({ id: 'guard_1' }) },
      enemyTemplates: { guard: makeTemplate({ id: 'guard' }) },
    })
    vi.spyOn(Math, 'random').mockReturnValue(0) // rollD20 = 1

    const result = checkDisguise(state, data)

    expect(result.messages).toHaveLength(0) // success due to high skill
    expect(result.state.flags['wearing_uniform']).toBe(true)
  })
})
