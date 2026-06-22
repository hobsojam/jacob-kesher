import type { Inventory, Skill } from './state'

export interface MissionManifest {
  id: string
  title: string
  description: string
  startingRoomId: string
  missionDeadline: number
  protagonist: {
    health: number
    stats: { strength: number; agility: number; intelligence: number; charisma: number }
    skills: Skill[]
    inventory: Inventory
  }
}
