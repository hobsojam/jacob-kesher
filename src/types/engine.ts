import type { GameState, NoiseLevel } from './state'

export interface SubSystemResult {
  state: GameState
  messages: string[]
  noise?: NoiseLevel
  timeCost?: number    // overrides ACTION_COSTS when set (e.g. search with variable difficulty)
  moveMode?: 'sneak' | 'run'  // set by movement sub-system; drives detection behaviour in index
}
