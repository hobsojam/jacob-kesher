import type { GameState, NoiseLevel } from './state'

export interface SubSystemResult {
  state: GameState
  messages: string[]
  noise?: NoiseLevel
  timeCost?: number  // overrides ACTION_COSTS when set (e.g. search with variable difficulty)
}
