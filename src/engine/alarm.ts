import type { Awareness } from '../types/state'

export function escalateAwareness(current: Awareness): Awareness {
  if (current === 'unaware')    return 'suspicious'
  if (current === 'suspicious') return 'alert'
  return 'alert'
}
