import type { GameData } from '../types/data'
import type { GameState } from '../types/state'
import { processAction } from '../engine/index'
import { renderHud } from './hud'
import { currentRoomLines, enemyDisplayName } from './room'
import { computeActions } from './actions'
import type { ActionButton } from './actions'
import { saveGame } from '../save/save'
import { loadGame } from '../save/load'

function carriedItems(inventory: GameState['protagonist']['inventory']): string[] {
  return [...inventory.weapons, ...inventory.gadgets, ...inventory.small, inventory.special]
    .filter((id): id is string => id !== null)
}

function renderInventory(el: HTMLElement, state: GameState, data: GameData): void {
  el.innerHTML = ''
  const items = carriedItems(state.protagonist.inventory)

  if (items.length === 0) {
    const empty = document.createElement('span')
    empty.className = 'inv-empty'
    empty.textContent = '— nothing carried —'
    el.appendChild(empty)
    return
  }

  const room = data.roomIndex[state.protagonist.currentRoom]
  const roomTargets = room?.examineTargets ?? []

  for (const itemId of items) {
    const item = data.itemData[itemId]
    if (!item) continue

    const isSelected = selectedItemId === itemId

    if (!isSelected) {
      const btn = document.createElement('button')
      btn.className = 'btn-inventory'
      btn.textContent = item.label
      btn.addEventListener('click', () => { selectedItemId = itemId; render() })
      el.appendChild(btn)
      continue
    }

    // Expanded item — full-width row with contextual actions
    const wrapper = document.createElement('div')
    wrapper.className = 'inv-item-expanded'

    const labelBtn = document.createElement('button')
    labelBtn.className = 'btn-inventory btn-inv-selected'
    labelBtn.textContent = item.label
    labelBtn.addEventListener('click', () => { selectedItemId = null; render() })
    wrapper.appendChild(labelBtn)

    const isWeapon = item.type === 'weapon_melee' || item.type === 'weapon_ranged'
    const applicableTargets = item.usableOn
      ? roomTargets.filter((t) => item.usableOn!.includes(t.id))
      : []

    if (applicableTargets.length > 0) {
      for (const target of applicableTargets) {
        const btn = document.createElement('button')
        btn.className = 'btn-inventory'
        btn.textContent = `Use on ${target.label}`
        btn.addEventListener('click', () => { selectedItemId = null; dispatch({ type: 'use', itemId, targetId: target.id }) })
        wrapper.appendChild(btn)
      }
    } else if (!isWeapon && item.type !== 'keycard') {
      const btn = document.createElement('button')
      btn.className = 'btn-inventory'
      btn.textContent = item.type === 'document' ? 'Read' : 'Use'
      btn.addEventListener('click', () => { selectedItemId = null; dispatch({ type: 'use', itemId }) })
      wrapper.appendChild(btn)
    }

    const dropBtn = document.createElement('button')
    dropBtn.className = 'btn-inventory'
    dropBtn.textContent = 'Drop'
    dropBtn.addEventListener('click', () => { selectedItemId = null; dispatch({ type: 'drop', itemId }) })
    wrapper.appendChild(dropBtn)

    el.appendChild(wrapper)
  }
}

let currentState: GameState
let gameData: GameData
let gameOver = false

const openGroups = new Set<string>()
const seenEnemyGroups = new Set<string>()  // enemy accordions auto-expand on first appearance
let selectedItemId: string | null = null

function appendMessages(messages: string[], isRoom = false): void {
  const narrative = document.getElementById('narrative')!
  for (let i = 0; i < messages.length; i++) {
    const p = document.createElement('p')
    p.textContent = messages[i]
    if (isRoom && i === 0) p.className = 'room-title'
    narrative.appendChild(p)
  }
  narrative.scrollTop = narrative.scrollHeight
}

function appendSeparator(): void {
  const narrative = document.getElementById('narrative')!
  const p = document.createElement('p')
  p.className = 'separator'
  p.textContent = '─────────────────────────────────────'
  narrative.appendChild(p)
}

function render(): void {
  renderHud(document.getElementById('hud')!, currentState)
  renderInventory(document.getElementById('inventory')!, currentState, gameData)

  const actionsEl = document.getElementById('actions')!
  actionsEl.innerHTML = ''

  if (!gameOver) {
    renderActionButtons(actionsEl, currentState, gameData)
  } else {
    const restartBtn = document.createElement('button')
    restartBtn.textContent = 'Restart mission'
    restartBtn.className = 'btn-misc'
    restartBtn.addEventListener('click', () => window.location.reload())
    actionsEl.appendChild(restartBtn)
  }

  renderSaveLoad(actionsEl)
}

function makeButton(btn: ActionButton, useShortLabel = false): HTMLButtonElement {
  const el = document.createElement('button')
  el.textContent = useShortLabel && btn.shortLabel ? btn.shortLabel : btn.label
  el.className = `btn-${btn.category}`
  if (btn.disabled) {
    el.disabled = true
    if (btn.disabledReason) el.title = btn.disabledReason
  } else {
    el.addEventListener('click', () => dispatch(btn.action))
  }
  return el
}

type Category = ActionButton['category']

const SECTIONS: { id: string; label: string; categories: Category[] }[] = [
  { id: '__exits__',   label: 'exits',   categories: ['move'] },
  { id: '__examine__', label: 'examine', categories: ['examine'] },
  { id: '__take__',    label: 'take',    categories: ['take'] },
  { id: '__misc__',    label: 'misc',    categories: ['misc'] },
]

function renderAccordion(
  container: HTMLElement,
  id: string,
  label: string,
  category: Category,
  btns: ActionButton[],
  opts: { hideDisabled?: boolean; useShortLabel?: boolean } = {},
): void {
  const isOpen = openGroups.has(id)

  const header = document.createElement('button')
  header.textContent = `${isOpen ? '▼' : '▶'} ${label}`
  header.className = `btn-${category} btn-accordion-header`
  header.addEventListener('click', () => {
    if (openGroups.has(id)) openGroups.delete(id)
    else openGroups.add(id)
    render()
  })
  container.appendChild(header)

  if (isOpen) {
    const body = document.createElement('div')
    body.className = 'accordion-body'
    let any = false
    for (const btn of btns) {
      if (opts.hideDisabled && btn.disabled) continue
      body.appendChild(makeButton(btn, !!opts.useShortLabel))
      any = true
    }
    if (any) container.appendChild(body)
  }
}

function renderActionButtons(container: HTMLElement, state: GameState, data: GameData): void {
  const buttons = computeActions(state, data)

  // Category sections (exits, examine, take, misc)
  for (const section of SECTIONS) {
    const btns = buttons.filter((b) => !b.groupId && section.categories.includes(b.category))
    if (btns.length === 0) continue
    renderAccordion(container, section.id, section.label, btns[0].category, btns)
  }

  // Per-enemy accordion groups — auto-expand on first appearance
  const groupIds = [...new Set(buttons.map((b) => b.groupId).filter((id): id is string => !!id))]
  for (const groupId of groupIds) {
    if (!seenEnemyGroups.has(groupId)) { seenEnemyGroups.add(groupId); openGroups.add(groupId) }
    const groupButtons = buttons.filter((b) => b.groupId === groupId)
    const enemy = data.enemyData[groupId]
    if (!enemy) continue

    const isDown = !!(state.enemyStates[groupId] && state.enemyStates[groupId].status !== 'active')
    const category: Category = isDown ? 'loot' : 'combat'
    const name = enemyDisplayName(enemy, data)
    const statusSuffix = isDown
      ? (state.enemyStates[groupId]?.status === 'dead' ? ' (dead)' : ' (unconscious)')
      : ''
    const equippedWeapon = !isDown
      ? state.protagonist.inventory.weapons.find((w): w is string => w !== null)
      : undefined
    const weaponSuffix = equippedWeapon ? ` · ${data.itemData[equippedWeapon]?.label ?? equippedWeapon}` : ''

    renderAccordion(container, groupId, `${name}${statusSuffix}${weaponSuffix}`, category, groupButtons, {
      hideDisabled: true,
      useShortLabel: true,
    })
  }
}

function renderSaveLoad(container: HTMLElement): void {
  const saveBtn = document.createElement('button')
  saveBtn.textContent = 'Save game'
  saveBtn.className = 'btn-misc'
  saveBtn.addEventListener('click', () => saveGame(currentState))
  container.appendChild(saveBtn)

  const loadBtn = document.createElement('button')
  loadBtn.textContent = 'Load game'
  loadBtn.className = 'btn-misc'
  loadBtn.addEventListener('click', () =>
    loadGame((loaded) => {
      currentState = loaded
      gameOver = false
      appendMessages(['Game loaded.'])
      render()
    }),
  )
  container.appendChild(loadBtn)
}

function confirmIfFinal(action: Parameters<typeof processAction>[0]): boolean {
  if (action.type !== 'interact') return true
  const room = gameData.roomIndex[currentState.protagonist.currentRoom]
  const target = room?.examineTargets.find((t) => t.id === action.targetId)
  const FINAL_FLAGS = new Set(['mission_complete', 'mission_failed'])
  const isFinal = target?.effect?.some((e) => {
    if (e.type === 'set_global_flag') return FINAL_FLAGS.has(e.flag)
    if (e.type === 'set_global_flag_if') return FINAL_FLAGS.has(e.flag) || FINAL_FLAGS.has(e.else_flag)
    return false
  })
  if (!isFinal) return true
  return window.confirm(target?.interactLabel ?? 'Are you sure?')
}

function dispatch(action: Parameters<typeof processAction>[0]): void {
  if (!confirmIfFinal(action)) return

  if (action.type === 'look') {
    // 'Look around' is a pure UI refresh — reads directly from currentState,
    // never touches engine state. This guarantees an accurate view of all
    // action conditionals regardless of how state was last modified.
    appendSeparator()
    appendMessages(currentRoomLines(currentState, gameData), true)
    render()
    return
  }

  const roomBefore = currentState.protagonist.currentRoom
  const result = processAction(action, currentState, gameData)
  currentState = result.state
  const movedRoom = action.type === 'move' && currentState.protagonist.currentRoom !== roomBefore

  if (movedRoom) {
    appendSeparator()
    appendMessages(currentRoomLines(currentState, gameData), true)
    if (result.messages.length > 0) appendMessages(result.messages)
  } else {
    appendMessages(result.messages)
  }

  if (result.gameOver) {
    gameOver = true
    const endings: Record<string, string> = {
      dead:    '--- You have been eliminated. Mission failed. ---',
      timeout: '--- Time has run out. Mission failed. ---',
      success: '--- Mission complete. ---',
      failed:  '--- Mission failed. ---',
    }
    appendMessages([endings[result.gameOver] ?? '--- Game over. ---'])
    showDebrief(result.gameOver, currentState)
  }

  render()
}

function debriefLine(outcome: string, state: GameState): string {
  if (outcome === 'success') {
    const remaining = state.time.missionDeadline - state.time.elapsed
    if (remaining <= 10) {
      return '"You cut that a bit fine, Kesher. Another thirty seconds and we would have had a very different conversation."'
    }
    return '"Not bad, Kesher. The photographs are with analysis. We will know more by Thursday."'
  }
  if (state.flags['machine_photographed']) {
    return '"Did you forget the camera, Kesher? The photographs were on the film. The film was in the camera. The camera was not in the car."'
  }
  if (outcome === 'timeout') {
    return '"The cipher officer came back. We had one window, Kesher. We will not get another one."'
  }
  if (outcome === 'dead') {
    return '"We will arrange repatriation. The mission is closed."'
  }
  return '"The mission is over, Kesher."'
}

function showDebrief(outcome: string, state: GameState): void {
  const enemyStates = Object.values(state.enemyStates)
  const neutralised = enemyStates.filter(
    (e) => e.status === 'unconscious' && !gameData.enemyData[e.id]?.startUnconscious,
  ).length
  const killed = enemyStates.filter((e) => e.status === 'dead').length
  const healthLost = state.protagonist.maxHealth - state.protagonist.health

  appendSeparator()
  appendMessages(['Whitehall'], true)
  appendMessages(['The same office. No sign on the door. Alderton sets down his pen.'])
  appendMessages([debriefLine(outcome, state)])
  appendMessages([
    `— Time on station: ${state.time.elapsed} of ${state.time.missionDeadline} turns`,
    `— Condition on extraction: ${state.protagonist.health}/${state.protagonist.maxHealth}${healthLost > 0 ? ` (${healthLost} damage taken)` : ''}`,
    ...(neutralised > 0 ? [`— Contacts neutralised: ${neutralised}`] : []),
    ...(killed > 0 ? [`— Contacts eliminated: ${killed}`] : []),
  ])
}

export function startGame(data: GameData, state: GameState): void {
  gameData = data
  currentState = state
  appendMessages(currentRoomLines(state, data), true)
  render()
}
