import type { GameState } from '../types/state'

export interface ValidationResult {
  ok: boolean
  errors: string[]
}

export function validateGameState(raw: unknown): ValidationResult {
  const errors: string[] = []

  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, errors: ['Save file is not a JSON object.'] }
  }

  const obj = raw as Record<string, unknown>

  checkObject(obj, 'protagonist', errors)
  checkObject(obj, 'time', errors)
  checkObject(obj, 'roomStates', errors)
  checkObject(obj, 'enemyStates', errors)
  checkObject(obj, 'itemStates', errors)
  checkObject(obj, 'flags', errors)

  if (errors.length === 0) {
    const p = obj['protagonist'] as Record<string, unknown>
    checkNumber(p, 'protagonist.health', errors)
    checkNumber(p, 'protagonist.maxHealth', errors)
    checkString(p, 'protagonist.currentRoom', errors)
    checkObject(p, 'protagonist.stats', errors)
    checkObject(p, 'protagonist.inventory', errors)
    checkArray(p, 'protagonist.skills', errors)
    checkObject(p, 'protagonist.flags', errors)

    const t = obj['time'] as Record<string, unknown>
    checkNumber(t, 'time.elapsed', errors)
    checkNumber(t, 'time.missionDeadline', errors)
  }

  return { ok: errors.length === 0, errors }
}

function checkObject(obj: Record<string, unknown>, key: string, errors: string[]): void {
  const leaf = key.split('.').pop()!
  const val = obj[leaf]
  if (typeof val !== 'object' || val === null || Array.isArray(val)) {
    errors.push(`Missing or invalid field: ${key}`)
  }
}

function checkNumber(obj: Record<string, unknown>, key: string, errors: string[]): void {
  const leaf = key.split('.').pop()!
  if (typeof obj[leaf] !== 'number') {
    errors.push(`Missing or invalid field: ${key}`)
  }
}

function checkString(obj: Record<string, unknown>, key: string, errors: string[]): void {
  const leaf = key.split('.').pop()!
  if (typeof obj[leaf] !== 'string') {
    errors.push(`Missing or invalid field: ${key}`)
  }
}

function checkArray(obj: Record<string, unknown>, key: string, errors: string[]): void {
  const leaf = key.split('.').pop()!
  if (!Array.isArray(obj[leaf])) {
    errors.push(`Missing or invalid field: ${key}`)
  }
}
