import type { SkillId } from './state'

export interface Exit {
  destinationId: string
  label: string
  requires?: {
    itemId?: string
    skillId?: SkillId
    skillLevel?: number
    flag?: string
  }
  hidden?: boolean
}

export interface Addendum {
  flag: string
  text: string
}

export interface ExamineTarget {
  id: string
  label: string
  description: string
  // Optional interaction: button label and one or more effects applied when triggered
  interactLabel?: string
  effect?: ItemEffect[]
  // Item or skill required before the interact can fire
  interactRequires?: {
    itemId?: string
    skillId?: SkillId
    skillLevel?: number
  }
}

export interface FlagReveal {
  flag: string    // room flag that triggers the reveal
  itemId: string  // item to move from hiddenItemIds into the room's visible itemIds
}

export interface RoomData {
  id: string
  label: string
  description: string
  addenda: Addendum[]
  exits: Exit[]
  itemIds: string[]
  hiddenItemIds: string[]
  examineTargets: ExamineTarget[]
  searchDifficulty?: number
  reveals?: FlagReveal[]
}

export type ItemType =
  | 'gadget'
  | 'weapon_melee'
  | 'weapon_ranged'
  | 'keycard'
  | 'document'
  | 'consumable'

export type ItemEffect =
  | { type: 'heal'; amount: number }
  | { type: 'set_room_flag'; flag: string }
  | { type: 'set_global_flag'; flag: string }

export interface ItemData {
  id: string
  label: string
  description: string
  type: ItemType
  effect?: ItemEffect
  usableOn?: string[]    // ExamineTarget IDs this item can be used on in the same room
}

export type EnemyType =
  | 'guard'
  | 'henchman'
  | 'villain'
  | 'dog'
  | 'civilian'
  | 'contact'

export interface EnemyTemplate {
  id: string
  type: EnemyType
  stats: {
    strength: number
    agility: number
    health: number
  }
  detectionRadius: number
  canBeBluffed: boolean
  canBeDisguised: boolean
  wakeAfterTurns?: number
  discoveryRisk?: number   // 0–1 probability per turn that a downed instance is found; default 0
}

export interface PatrolRoute {
  roomIds: string[]
  cycleTime: number
  startOffset?: number
}

export interface EnemyData {
  id: string
  // When false (default), the renderer shows a generic role label ("a guard")
  // instead of the name. Set true for story characters the player knows from
  // the start; flip it dynamically via flags when the player learns who they are.
  known?: boolean
  name: string
  // Shown in the room description while the enemy is active. Disappears once
  // they are unconscious or dead. Use it to set the scene: posture, activity,
  // awareness — anything that gives the player context for their approach.
  description?: string
  templateId: string
  roomId: string
  patrol?: PatrolRoute
  inventory: string[]
}

export interface GameData {
  roomIndex: Record<string, RoomData>
  itemData: Record<string, ItemData>
  enemyTemplates: Record<string, EnemyTemplate>
  enemyData: Record<string, EnemyData>
}
