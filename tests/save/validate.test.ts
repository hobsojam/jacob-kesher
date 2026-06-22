import { describe, it, expect } from 'vitest'
import { validateGameState } from '../../src/save/validate'

const validState = {
  protagonist: {
    currentRoom: 'start',
    previousRoomId: null,
    health: 10,
    maxHealth: 10,
    stats: { strength: 3, agility: 4, intelligence: 3, charisma: 2 },
    skills: [],
    inventory: { weapons: [null, null], gadgets: [null, null], small: [null, null, null], special: null },
    flags: {},
  },
  time: { elapsed: 0, missionDeadline: 80 },
  roomStates: {},
  enemyStates: {},
  itemStates: {},
  flags: {},
}

describe('validateGameState', () => {
  it('accepts a valid GameState', () => {
    const result = validateGameState(validState)
    expect(result.ok).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('rejects null', () => {
    const result = validateGameState(null)
    expect(result.ok).toBe(false)
    expect(result.errors[0]).toMatch(/not a JSON object/)
  })

  it('rejects a non-object', () => {
    expect(validateGameState('save data')).toMatchObject({ ok: false })
    expect(validateGameState(42)).toMatchObject({ ok: false })
    expect(validateGameState([])).toMatchObject({ ok: false })
  })

  it('rejects missing top-level fields', () => {
    const { protagonist: _p, ...withoutProtagonist } = validState
    expect(validateGameState(withoutProtagonist)).toMatchObject({ ok: false })
    expect(validateGameState(withoutProtagonist).errors).toContain('Missing or invalid field: protagonist')

    const { flags: _f, ...withoutFlags } = validState
    expect(validateGameState(withoutFlags)).toMatchObject({ ok: false })
  })

  it('rejects protagonist with missing health', () => {
    const bad = { ...validState, protagonist: { ...validState.protagonist, health: 'ten' } }
    const result = validateGameState(bad)
    expect(result.ok).toBe(false)
    expect(result.errors).toContain('Missing or invalid field: protagonist.health')
  })

  it('rejects protagonist with missing maxHealth', () => {
    const bad = { ...validState, protagonist: { ...validState.protagonist, maxHealth: undefined } }
    const result = validateGameState(bad)
    expect(result.ok).toBe(false)
    expect(result.errors).toContain('Missing or invalid field: protagonist.maxHealth')
  })

  it('rejects protagonist with non-string currentRoom', () => {
    const bad = { ...validState, protagonist: { ...validState.protagonist, currentRoom: 123 } }
    const result = validateGameState(bad)
    expect(result.ok).toBe(false)
    expect(result.errors).toContain('Missing or invalid field: protagonist.currentRoom')
  })

  it('rejects time with non-number elapsed', () => {
    const bad = { ...validState, time: { elapsed: 'zero', missionDeadline: 80 } }
    const result = validateGameState(bad)
    expect(result.ok).toBe(false)
    expect(result.errors).toContain('Missing or invalid field: time.elapsed')
  })

  it('rejects time with missing missionDeadline', () => {
    const bad = { ...validState, time: { elapsed: 0 } }
    const result = validateGameState(bad)
    expect(result.ok).toBe(false)
    expect(result.errors).toContain('Missing or invalid field: time.missionDeadline')
  })

  it('rejects protagonist with array stats', () => {
    const bad = { ...validState, protagonist: { ...validState.protagonist, stats: [3, 4, 3, 2] } }
    const result = validateGameState(bad)
    expect(result.ok).toBe(false)
    expect(result.errors).toContain('Missing or invalid field: protagonist.stats')
  })

  it('rejects protagonist with missing skills array', () => {
    const bad = { ...validState, protagonist: { ...validState.protagonist, skills: {} } }
    const result = validateGameState(bad)
    expect(result.ok).toBe(false)
    expect(result.errors).toContain('Missing or invalid field: protagonist.skills')
  })

  it('reports all errors at once, not just the first', () => {
    const bad = {
      ...validState,
      protagonist: {
        ...validState.protagonist,
        health: 'ten',
        maxHealth: null,
      },
    }
    const result = validateGameState(bad)
    expect(result.errors.length).toBeGreaterThan(1)
  })
})
