import type { GameState, NoiseLevel } from './state'

export interface SubSystemResult {
  state: GameState
  messages: string[]
  noise?: NoiseLevel
}
