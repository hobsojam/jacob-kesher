import type { AlarmLevel, NoiseLevel } from '../types/state'

const ESCALATION_CHANCE: Record<NoiseLevel, number> = {
  silent: 0,
  quiet: 0.15,
  loud: 0.4,
  alarming: 0.85,
}

const ALARM_LEVELS: AlarmLevel[] = [
  'undetected',
  'suspicious',
  'searching',
  'alert',
  'lockdown',
]

export function escalateAlarm(current: AlarmLevel): AlarmLevel {
  const index = ALARM_LEVELS.indexOf(current)
  return ALARM_LEVELS[Math.min(index + 1, ALARM_LEVELS.length - 1)]
}

export function applyNoise(noise: NoiseLevel, current: AlarmLevel): AlarmLevel {
  if (Math.random() < ESCALATION_CHANCE[noise]) {
    return escalateAlarm(current)
  }
  return current
}
