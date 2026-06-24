export type Action =
  | { type: 'move'; exitLabel: string; mode?: 'sneak' | 'run' }
  | { type: 'take'; itemId: string }
  | { type: 'drop'; itemId: string }
  | { type: 'examine'; targetId: string }
  | { type: 'search' }
  | { type: 'use'; itemId: string; targetId?: string }
  | { type: 'attack'; enemyId: string }
  | { type: 'stealth_takedown'; enemyId: string; intent: 'neutralise' | 'kill' }
  | { type: 'flee' }
  | { type: 'loot'; enemyId: string; itemId: string }
  | { type: 'look' }
  | { type: 'interact'; targetId: string }
  | { type: 'talk'; enemyId: string }
