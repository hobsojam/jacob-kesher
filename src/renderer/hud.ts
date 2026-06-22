import type { AlarmLevel, GameState } from '../types/state'

const ALARM_LABEL: Record<AlarmLevel, string> = {
  undetected: 'UNDETECTED',
  suspicious:  'SUSPICIOUS',
  searching:   'SEARCHING',
  alert:       'ALERT',
  lockdown:    'LOCKDOWN',
}

export function renderHud(el: HTMLElement, state: GameState): void {
  const { health } = state.protagonist
  const { elapsed, missionDeadline } = state.time
  const alarm = state.alarmLevel

  el.innerHTML =
    `<span class="hud-health">♥ ${health}</span>` +
    `<span class="hud-alarm hud-alarm--${alarm}">${ALARM_LABEL[alarm]}</span>` +
    `<span class="hud-time">Turn ${elapsed} / ${missionDeadline}</span>`
}
