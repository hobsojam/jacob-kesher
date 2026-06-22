import { describe, it, expect } from 'vitest'
import { escalateAwareness } from '../../src/engine/alarm'

describe('escalateAwareness', () => {
  it('advances from unaware to suspicious', () => {
    expect(escalateAwareness('unaware')).toBe('suspicious')
  })

  it('advances from suspicious to alert', () => {
    expect(escalateAwareness('suspicious')).toBe('alert')
  })

  it('clamps at alert', () => {
    expect(escalateAwareness('alert')).toBe('alert')
  })
})
