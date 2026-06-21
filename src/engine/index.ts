import type { Action } from '../types/actions'
import type { GameData } from '../types/data'
import type { GameState } from '../types/state'

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
  void data
  return { state, messages: [`Unknown action: ${action.type}`] }
}
