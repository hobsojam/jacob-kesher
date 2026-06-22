import type { GameState } from '../types/state'
import { SKILLS, SKILL_POINTS } from '../constants'

export function showCharGen(_data: unknown, state: GameState, onComplete: (state: GameState) => void): void {
  const levels: Record<string, number> = Object.fromEntries(SKILLS.map((s) => [s.id, 0]))
  let remaining = SKILL_POINTS

  const overlay = document.createElement('div')
  overlay.id = 'chargen'
  overlay.style.cssText = `
    position: fixed; inset: 0; background: #0d0d0d;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    font-family: 'Courier New', Courier, monospace; color: #c8c8b4; padding: 2rem;
    z-index: 100;
  `

  const title = document.createElement('h1')
  title.textContent = 'FIELD DOSSIER'
  title.style.cssText = 'font-size: 18px; letter-spacing: 0.2em; color: #e8e8d0; margin-bottom: 0.4rem;'

  const subtitle = document.createElement('p')
  subtitle.textContent = 'Allocate 5 skill points before insertion.'
  subtitle.style.cssText = 'font-size: 12px; color: #505048; margin-bottom: 1.6rem; letter-spacing: 0.06em;'

  const pointsEl = document.createElement('p')
  pointsEl.style.cssText = 'font-size: 13px; letter-spacing: 0.08em; margin-bottom: 1.2rem; color: #909080;'

  const grid = document.createElement('div')
  grid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem 3rem; width: 100%; max-width: 640px;'

  const beginBtn = document.createElement('button')
  beginBtn.textContent = 'BEGIN MISSION'
  beginBtn.disabled = true
  beginBtn.style.cssText = `
    margin-top: 1.6rem; padding: 0.5rem 2rem; font-size: 13px;
    letter-spacing: 0.15em; border: 1px solid #284860; background: #0d0d0d;
    color: #b8b8a4; cursor: pointer; font-family: inherit;
  `

  function refresh(): void {
    pointsEl.textContent = `Points remaining: ${remaining}`
    beginBtn.disabled = remaining !== 0

    for (const s of SKILLS) {
      const minusBtn = document.getElementById(`skill-minus-${s.id}`) as HTMLButtonElement
      const plusBtn  = document.getElementById(`skill-plus-${s.id}`)  as HTMLButtonElement
      const levelEl  = document.getElementById(`skill-level-${s.id}`)!

      levelEl.textContent = String(levels[s.id])
      minusBtn.disabled = levels[s.id] === 0
      plusBtn.disabled  = remaining === 0 || levels[s.id] >= SKILL_POINTS
    }
  }

  for (const s of SKILLS) {
    const row = document.createElement('div')
    row.style.cssText = 'display: flex; flex-direction: column; gap: 0.15rem;'

    const labelRow = document.createElement('div')
    labelRow.style.cssText = 'display: flex; align-items: center; gap: 0.5rem;'

    const nameEl = document.createElement('span')
    nameEl.textContent = s.label
    nameEl.style.cssText = 'color: #e8e8d0; font-size: 13px; min-width: 110px;'

    const controls = document.createElement('div')
    controls.style.cssText = 'display: flex; align-items: center; gap: 0.3rem;'

    const minusBtn = document.createElement('button')
    minusBtn.id = `skill-minus-${s.id}`
    minusBtn.textContent = '−'
    minusBtn.style.cssText = 'padding: 0.1rem 0.5rem; font-size: 14px;'
    minusBtn.addEventListener('click', () => {
      if (levels[s.id] > 0) { levels[s.id]--; remaining++; refresh() }
    })

    const levelEl = document.createElement('span')
    levelEl.id = `skill-level-${s.id}`
    levelEl.textContent = '0'
    levelEl.style.cssText = 'min-width: 1.2rem; text-align: center; color: #e8e8d0;'

    const plusBtn = document.createElement('button')
    plusBtn.id = `skill-plus-${s.id}`
    plusBtn.textContent = '+'
    plusBtn.style.cssText = 'padding: 0.1rem 0.5rem; font-size: 14px;'
    plusBtn.addEventListener('click', () => {
      if (remaining > 0 && levels[s.id] < SKILL_POINTS) { levels[s.id]++; remaining--; refresh() }
    })

    controls.append(minusBtn, levelEl, plusBtn)

    const descEl = document.createElement('span')
    descEl.textContent = s.description
    descEl.style.cssText = 'font-size: 10px; color: #484840; letter-spacing: 0.04em;'

    labelRow.append(nameEl, controls)
    row.append(labelRow, descEl)
    grid.appendChild(row)
  }

  beginBtn.addEventListener('click', () => {
    if (remaining !== 0) return
    const updatedSkills = state.protagonist.skills.map((sk) => ({
      ...sk,
      level: levels[sk.id] ?? 0,
    }))
    const finalState: GameState = {
      ...state,
      protagonist: { ...state.protagonist, skills: updatedSkills },
    }
    overlay.remove()
    onComplete(finalState)
  })

  overlay.append(title, subtitle, pointsEl, grid, beginBtn)
  document.body.appendChild(overlay)
  refresh()
}
