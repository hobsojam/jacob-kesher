import type { EnemyData, EnemyTemplate, GameData, ItemData, RoomData } from '../types/data'
import type { GameState } from '../types/state'
import type { MissionManifest } from '../types/mission'
import { initRoomState } from '../engine/room'

export function buildGameData(
  rooms: RoomData[],
  items: ItemData[],
  enemies: EnemyData[],
  templates: EnemyTemplate[],
): GameData {
  return {
    roomIndex:      Object.fromEntries(rooms.map((r) => [r.id, r])),
    itemData:       Object.fromEntries(items.map((i) => [i.id, i])),
    enemyData:      Object.fromEntries(enemies.map((e) => [e.id, e])),
    enemyTemplates: Object.fromEntries(templates.map((t) => [t.id, t])),
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
      stats:          manifest.protagonist.stats,
      skills:         manifest.protagonist.skills,
      inventory:      manifest.protagonist.inventory,
      flags:          {},
    },
    time:        { elapsed: 0, missionDeadline: manifest.missionDeadline },
    alarmLevel:  'undetected',
    roomStates,
    enemyStates: {},
    itemStates:  {},
    flags:       {},
  }
}
