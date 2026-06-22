import type { Awareness, GameState } from '../types/state'

const AWARENESS_LABEL: Record<Awareness, string> = {
  unaware:    'UNDETECTED',
  suspicious: 'SUSPICIOUS',
  alert:      'ALERT',
}

function deriveAwareness(state: GameState): Awareness {
  if (state.flags['alarm_raised']) return 'alert'
  let worst: Awareness = 'unaware'
  for (const es of Object.values(state.enemyStates)) {
    if (es.status !== 'active') continue
    const a = es.awareness ?? 'unaware'
    if (a === 'alert') return 'alert'
    if (a === 'suspicious') worst = 'suspicious'
  }
  return worst
}

export function renderHud(el: HTMLElement, state: GameState): void {
  const { health } = state.protagonist
  const { elapsed, missionDeadline } = state.time
  const awareness = deriveAwareness(state)

  const { maxHealth } = state.protagonist
  el.innerHTML =
    `<span class="hud-health">♥ ${health}/${maxHealth}</span>` +
    `<span class="hud-alarm hud-alarm--${awareness}">${AWARENESS_LABEL[awareness]}</span>` +
    `<span class="hud-time">Turn ${elapsed} / ${missionDeadline}</span>`
}
