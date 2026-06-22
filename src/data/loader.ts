import type { EnemyData, EnemyTemplate, GameData, ItemData, RoomData } from '../types/data'
import type { GameState } from '../types/state'
import type { MissionManifest } from '../types/mission'
import { initRoomState } from '../engine/room'
import { SKILLS } from '../constants'

export function buildGameData(
  rooms: RoomData[],
  items: ItemData[],
  enemies: EnemyData[],
  templates: EnemyTemplate[],
  manifest: MissionManifest,
): GameData {
  const data: GameData = {
    roomIndex:       Object.fromEntries(rooms.map((r) => [r.id, r])),
    itemData:        Object.fromEntries(items.map((i) => [i.id, i])),
    enemyData:       Object.fromEntries(enemies.map((e) => [e.id, e])),
    enemyTemplates:  Object.fromEntries(templates.map((t) => [t.id, t])),
    deadlineMessage: manifest.deadlineMessage,
  }
  validateGameData(data)
  return data
}

function validateGameData(data: GameData): void {
  const knownSkillIds = new Set(SKILLS.map((s) => s.id))
  const errors: string[] = []

  for (const room of Object.values(data.roomIndex)) {
    for (const exit of room.exits) {
      if (exit.requires?.skillId && !knownSkillIds.has(exit.requires.skillId)) {
        errors.push(`Room "${room.id}" exit "${exit.label}": unknown skillId "${exit.requires.skillId}"`)
      }
      if (exit.destinationId !== '__fallback__' && !data.roomIndex[exit.destinationId]) {
        errors.push(`Room "${room.id}" exit "${exit.label}": unknown destinationId "${exit.destinationId}"`)
      }
    }
    for (const target of room.examineTargets) {
      if (target.interactRequires?.skillId && !knownSkillIds.has(target.interactRequires.skillId)) {
        errors.push(`Room "${room.id}" target "${target.id}": unknown skillId "${target.interactRequires.skillId}"`)
      }
    }
  }

  for (const enemy of Object.values(data.enemyData)) {
    if (!data.enemyTemplates[enemy.templateId]) {
      errors.push(`Enemy "${enemy.id}": unknown templateId "${enemy.templateId}"`)
    }
  }

  if (errors.length > 0) {
    const msg = `Mission data validation failed:\n${errors.map((e) => `  • ${e}`).join('\n')}`
    console.error(msg)
    throw new Error(msg)
  }
}

export function initGameState(manifest: MissionManifest, data: GameData): GameState {
  const roomStates = Object.fromEntries(
    Object.keys(data.roomIndex).map((id) => [id, initRoomState(id, data)]),
  )

  if (roomStates[manifest.startingRoomId]) {
    roomStates[manifest.startingRoomId] = {
      ...roomStates[manifest.startingRoomId],
      visited: true,
    }
  }

  return {
    protagonist: {
      currentRoom:    manifest.startingRoomId,
      previousRoomId: null,
      health:         manifest.protagonist.health,
      maxHealth:      manifest.protagonist.health,
      stats:          manifest.protagonist.stats,
      skills:         SKILLS.map((s) => ({ id: s.id, label: s.label, level: 0 })),
      inventory:      manifest.protagonist.inventory,
      flags:          {},
    },
    time:      { elapsed: 0, missionDeadline: manifest.missionDeadline },
    roomStates,
    enemyStates: {},
    itemStates:  {},
    flags:       {},
  }
}
