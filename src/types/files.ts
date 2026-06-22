import type { RoomData, ItemData, EnemyData, EnemyTemplate } from './data'
import type { MissionManifest } from './mission'

export interface MapFile      { rooms:     RoomData[]      }
export interface ItemsFile    { items:     ItemData[]      }
export interface EnemiesFile  { enemies:   EnemyData[]     }
export interface TemplatesFile { templates: EnemyTemplate[] }
export type { MissionManifest }
