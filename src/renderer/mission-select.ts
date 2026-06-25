interface MissionOption {
  id: string
  title: string
  description: string
  deadline: number
}

export function showMissionSelect(missions: MissionOption[], onSelect: (id: string) => void): void {
  const overlay = document.createElement('div')
  overlay.id = 'mission-select'
  overlay.style.cssText = `
    position: fixed; inset: 0; background: #0d0d0d;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    font-family: 'Courier New', Courier, monospace; color: #c8c8b4; padding: 2rem;
    z-index: 100;
  `

  const title = document.createElement('h1')
  title.textContent = 'SELECT MISSION'
  title.style.cssText = 'font-size: 18px; letter-spacing: 0.2em; color: #e8e8d0; margin-bottom: 0.4rem;'

  const subtitle = document.createElement('p')
  subtitle.textContent = 'Choose an operation. Skill allocation follows.'
  subtitle.style.cssText = 'font-size: 12px; color: #505048; margin-bottom: 2rem; letter-spacing: 0.06em;'

  const cards = document.createElement('div')
  cards.style.cssText = 'display: flex; flex-direction: column; gap: 1rem; width: 100%; max-width: 560px;'

  for (const [i, mission] of missions.entries()) {
    const card = document.createElement('div')
    card.style.cssText = `
      border: 1px solid #1e1e18; padding: 1.2rem 1.4rem; background: #111;
      display: flex; flex-direction: column; gap: 0.5rem; cursor: pointer;
    `

    const code = document.createElement('span')
    code.textContent = `M-${String(i + 1).padStart(2, '0')}`
    code.style.cssText = 'font-size: 10px; color: #404038; letter-spacing: 0.15em;'

    const missionTitle = document.createElement('span')
    missionTitle.textContent = mission.title.toUpperCase()
    missionTitle.style.cssText = 'font-size: 14px; color: #e8e8d0; letter-spacing: 0.1em;'

    const desc = document.createElement('p')
    desc.textContent = mission.description
    desc.style.cssText = 'font-size: 11px; color: #686860; line-height: 1.5; margin: 0.3rem 0 0.6rem;'

    const footer = document.createElement('div')
    footer.style.cssText = 'display: flex; align-items: center; justify-content: space-between;'

    const deadline = document.createElement('span')
    deadline.textContent = `${mission.deadline} TURNS`
    deadline.style.cssText = 'font-size: 10px; color: #404038; letter-spacing: 0.1em;'

    const btn = document.createElement('button')
    btn.textContent = 'SELECT'
    btn.style.cssText = `
      padding: 0.3rem 1.2rem; font-size: 11px; letter-spacing: 0.15em;
      border: 1px solid #284860; background: #0d0d0d; color: #b8b8a4;
      cursor: pointer; font-family: inherit;
    `
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      overlay.remove()
      onSelect(mission.id)
    })

    footer.append(deadline, btn)
    card.append(code, missionTitle, desc, footer)

    card.addEventListener('mouseenter', () => { card.style.borderColor = '#284860' })
    card.addEventListener('mouseleave', () => { card.style.borderColor = '#1e1e18' })

    cards.appendChild(card)
  }

  overlay.append(title, subtitle, cards)
  document.body.appendChild(overlay)
}
