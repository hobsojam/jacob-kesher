import type { RoomData } from './types/data'
import type { SkillId } from './types/state'

export const SKILL_POINTS = 5

export const SKILLS: { id: SkillId; label: string; description: string }[] = [
  { id: 'pugilism',     label: 'Pugilism',     description: 'Unarmed and melee attack bonus.' },
  { id: 'marksmanship', label: 'Marksmanship', description: 'Ranged weapon attack bonus.' },
  { id: 'evasion',      label: 'Evasion',      description: 'Defence bonus against all attacks.' },
  { id: 'safecracking', label: 'Safecracking', description: 'Bypass locks, safes, and secured doors.' },
  { id: 'covert',       label: 'Covert',       description: 'Reduce detection chance when moving.' },
  { id: 'signals',      label: 'Signals',      description: 'Hack terminals and electronic security.' },
  { id: 'disguise',     label: 'Disguise',     description: 'Pass as non-hostile to guards and civilians.' },
  { id: 'acrobatics',   label: 'Acrobatics',   description: 'Climb, jump, and traverse physical obstacles.' },
]

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
