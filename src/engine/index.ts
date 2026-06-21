import type { Action } from '../types/actions'
import type { GameData } from '../types/data'
import type { GameState } from '../types/state'
import type { SubSystemResult } from '../types/engine'
import { ACTION_COSTS } from '../constants'
import { handleMove } from './movement'
import { handleTake, handleDrop, handleLoot } from './inventory'
import { handleSearch } from './search'
import { handleAttack, handleStealthTakedown, handleFlee } from './combat'

export interface EngineResult {
  state: GameState
  messages: string[]
  gameOver?: 'dead' | 'timeout' | 'success'
}

export function processAction(
  action: Action,
  state: GameState,
  data: GameData,
): EngineResult {
  const result = dispatch(action, state, data)
  const advanced = advanceTime(action.type, result.state, result.timeCost)
  const { state: finalState, gameOver } = checkDeadlines(advanced)

  return { state: finalState, messages: result.messages, gameOver }
}

function dispatch(
  action: Action,
  state: GameState,
  data: GameData,
): SubSystemResult {
  switch (action.type) {
    case 'move':
      return handleMove(action.exitLabel, state, data)
    case 'take':
      return handleTake(action.itemId, state, data)
    case 'drop':
      return handleDrop(action.itemId, state, data)
    case 'loot':
      return handleLoot(action.enemyId, action.itemId, state, data)
    case 'search':
      return handleSearch(state, data)
    case 'attack':
      return handleAttack(action.enemyId, state, data)
    case 'stealth_takedown':
      return handleStealthTakedown(action.enemyId, action.intent, state, data)
    case 'flee':
      return handleFlee(state, data)
    default:
      return { state, messages: [`Action "${action.type}" not yet implemented.`] }
  }
}

function advanceTime(actionType: string, state: GameState, timeCost?: number): GameState {
  const cost = timeCost ?? ACTION_COSTS[actionType] ?? 1
  return {
    ...state,
    time: { ...state.time, elapsed: state.time.elapsed + cost },
  }
}

function checkDeadlines(state: GameState): {
  state: GameState
  gameOver?: 'dead' | 'timeout' | 'success'
} {
  if (state.time.elapsed >= state.time.missionDeadline) {
    return { state, gameOver: 'timeout' }
  }
  if (state.protagonist.health <= 0) {
    return { state, gameOver: 'dead' }
  }
  return { state }
}
