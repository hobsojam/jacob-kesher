export interface Skill {
  id: string
  label: string
  level: number
}

export interface Inventory {
  weapons: [string | null, string | null]
  gadgets: [string | null, string | null]
  small: [string | null, string | null, string | null]
  special: string | null
}

export interface Protagonist {
  currentRoom: string
  previousRoomId: string | null
  health: number
  stats: {
    strength: number
    agility: number
    intelligence: number
    charisma: number
  }
  skills: Skill[]
  inventory: Inventory
  flags: Record<string, boolean>
}

export interface RoomState {
  id: string
  itemIds: string[]
  enemyIds: string[]
  flags: Record<string, boolean>
  visited: boolean
}

export interface ItemState {
  id: string
  used: boolean
  broken: boolean
}

export interface EnemyState {
  id: string
  status: 'active' | 'unconscious' | 'dead'
  unconsciousUntil?: number
  inventory: string[]
}

export interface TimeState {
  elapsed: number
  missionDeadline: number
}

export type AlarmLevel =
  | 'undetected'
  | 'suspicious'
  | 'searching'
  | 'alert'
  | 'lockdown'

export type NoiseLevel = 'silent' | 'quiet' | 'loud' | 'alarming'

export interface GameState {
  protagonist: Protagonist
  time: TimeState
  alarmLevel: AlarmLevel
  roomStates: Record<string, RoomState>
  enemyStates: Record<string, EnemyState>
  itemStates: Record<string, ItemState>
  flags: Record<string, boolean>
}
