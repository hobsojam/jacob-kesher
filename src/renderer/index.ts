import type { GameData } from '../types/data'
import type { GameState } from '../types/state'
import { processAction } from '../engine/index'
import { renderHud } from './hud'
import { currentRoomLines } from './room'
import { computeActions } from './actions'
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

  for (const itemId of items) {
    const item = data.itemData[itemId]
    if (!item) continue

    const row = document.createElement('div')
    row.className = 'inv-row'

    const label = document.createElement('span')
    label.className = 'inv-label'
    label.textContent = item.label
    row.appendChild(label)

    const room = data.roomIndex[state.protagonist.currentRoom]
    const targets = room?.examineTargets ?? []
    const applicableTargets = item.usableOn
      ? targets.filter((t) => item.usableOn!.includes(t.id))
      : []

    if (applicableTargets.length > 0) {
      for (const target of applicableTargets) {
        const useOnBtn = document.createElement('button')
        useOnBtn.className = 'btn-inventory'
        useOnBtn.textContent = `Use on ${target.label}`
        useOnBtn.addEventListener('click', () => dispatch({ type: 'use', itemId, targetId: target.id }))
        row.appendChild(useOnBtn)
      }
    } else {
      const useBtn = document.createElement('button')
      useBtn.className = 'btn-inventory'
      useBtn.textContent = 'Use'
      useBtn.addEventListener('click', () => dispatch({ type: 'use', itemId }))
      row.appendChild(useBtn)
    }

    const dropBtn = document.createElement('button')
    dropBtn.className = 'btn-inventory'
    dropBtn.textContent = 'Drop'
    dropBtn.addEventListener('click', () => dispatch({ type: 'drop', itemId }))
    row.appendChild(dropBtn)

    el.appendChild(row)
  }
}

let currentState: GameState
let gameData: GameData
let gameOver = false

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
    const buttons = computeActions(currentState, gameData)
    for (const btn of buttons) {
      const el = document.createElement('button')
      el.textContent = btn.label
      el.className = `btn-${btn.category}`
      if (btn.disabled) {
        el.disabled = true
        if (btn.disabledReason) el.title = btn.disabledReason
      } else {
        el.addEventListener('click', () => dispatch(btn.action))
      }
      actionsEl.appendChild(el)
    }
  }

  renderSaveLoad(actionsEl)
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

function dispatch(action: Parameters<typeof processAction>[0]): void {
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
    }
    appendMessages([endings[result.gameOver] ?? '--- Game over. ---'])
  }

  render()
}

export function startGame(data: GameData, state: GameState): void {
  gameData = data
  currentState = state
  appendMessages(currentRoomLines(state, data), true)
  render()
}
