import { describe, it, expect, vi } from 'vitest'
import { escalateAlarm, applyNoise } from '../../src/engine/alarm'

describe('escalateAlarm', () => {
  it('advances one step', () => {
    expect(escalateAlarm('undetected')).toBe('suspicious')
    expect(escalateAlarm('suspicious')).toBe('searching')
    expect(escalateAlarm('searching')).toBe('alert')
    expect(escalateAlarm('alert')).toBe('lockdown')
  })

  it('clamps at lockdown', () => {
    expect(escalateAlarm('lockdown')).toBe('lockdown')
  })
})

describe('applyNoise', () => {
  it('silent noise never escalates', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(applyNoise('silent', 'undetected')).toBe('undetected')
    vi.restoreAllMocks()
  })

  it('escalates when random roll is below threshold', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    expect(applyNoise('quiet', 'undetected')).toBe('suspicious')
    vi.restoreAllMocks()
  })

  it('does not escalate when roll is above threshold', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    expect(applyNoise('alarming', 'undetected')).toBe('undetected')
    vi.restoreAllMocks()
  })

  it('alarming noise escalates on high-probability roll', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    expect(applyNoise('alarming', 'undetected')).toBe('suspicious')
    vi.restoreAllMocks()
  })
})
