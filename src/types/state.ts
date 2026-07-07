export type SkillId =
  | 'pugilism'
  | 'marksmanship'
  | 'evasion'
  | 'safecracking'
  | 'covert'
  | 'signals'
  | 'disguise'
  | 'acrobatics'

export interface Skill {
  id: SkillId
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
  maxHealth: number
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

// Per-guard awareness state. Absent means 'unaware'.
export type Awareness = 'unaware' | 'suspicious' | 'alert'

export interface EnemyState {
  id: string
  status: 'active' | 'unconscious' | 'dead'
  health?: number            // current health; undefined means full health from template
  unconsciousUntil?: number
  inventory: string[]
  awareness?: Awareness      // undefined === 'unaware'
  bodyRoomId?: string        // room where enemy fell; set on unconscious/dead, absent means use EnemyData.roomId
  // Present while actively chasing Jacob after losing him from an alert encounter.
  // roomId overrides patrol/alarm positioning; cleared when contact is re-made+attacked
  // or when turnsWithoutContact reaches the template's give-up threshold.
  pursuit?: { roomId: string; turnsWithoutContact: number }
}

export interface TimeState {
  elapsed: number
  missionDeadline: number
  timerActive?: boolean   // undefined means active; only false pauses the timer
}

export type NoiseLevel = 'silent' | 'quiet' | 'loud' | 'alarming'

export interface GameState {
  protagonist: Protagonist
  time: TimeState
  roomStates: Record<string, RoomState>
  enemyStates: Record<string, EnemyState>
  itemStates: Record<string, ItemState>
  flags: Record<string, boolean>
}
