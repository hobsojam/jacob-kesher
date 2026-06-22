import type { GameData } from '../types/data'
import type { GameState } from '../types/state'
import { processAction } from '../engine/index'
import { renderHud } from './hud'
import { currentRoomLines } from './room'
import { computeActions } from './actions'

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

  const actionsEl = document.getElementById('actions')!
  actionsEl.innerHTML = ''

  if (gameOver) return

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

function dispatch(action: Parameters<typeof processAction>[0]): void {
  const result = processAction(action, currentState, gameData)
  currentState = result.state
  appendMessages(result.messages)

  if (result.gameOver) {
    gameOver = true
    const endings: Record<string, string> = {
      dead:    '--- You have been eliminated. Mission failed. ---',
      timeout: '--- Time has run out. Mission failed. ---',
      success: '--- Mission complete. ---',
    }
    appendMessages([endings[result.gameOver] ?? '--- Game over. ---'])
  }

  if (action.type === 'move' || action.type === 'look') {
    appendSeparator()
    appendMessages(currentRoomLines(currentState, gameData), true)
  }

  render()
}

export function startGame(data: GameData, state: GameState): void {
  gameData = data
  currentState = state
  appendMessages(currentRoomLines(state, data), true)
  render()
}
