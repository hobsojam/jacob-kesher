import type { RoomData } from './types/data'

export const ACTION_COSTS: Record<string, number> = {
  move: 1,
  examine: 1,
  take: 1,
  use: 1,
  look: 0,
  combat: 2,
  search: 4,
}

export const FALLBACK_ROOM: RoomData = {
  id: '__fallback__',
  label: 'Darkness',
  description: 'It is pitch black. You are likely to be eaten by a grue.',
  addenda: [],
  exits: [],
  itemIds: [],
  hiddenItemIds: [],
  examineTargets: [],
}
