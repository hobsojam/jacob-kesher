import './style.css'
import { buildGameData, initGameState } from './data/loader'
import { startGame } from './renderer/index'

import type { RoomData, ItemData, EnemyData, EnemyTemplate } from './types/data'
import type { MissionManifest } from './types/mission'

import mapRaw from './data/missions/mission-01/map.json'
import itemsRaw from './data/missions/mission-01/items.json'
import enemiesRaw from './data/missions/mission-01/enemies.json'
import manifestRaw from './data/missions/mission-01/manifest.json'
import templatesRaw from './data/templates.json'

const data = buildGameData(
  mapRaw.rooms as RoomData[],
  itemsRaw.items as ItemData[],
  enemiesRaw.enemies as EnemyData[],
  templatesRaw.templates as EnemyTemplate[],
)

const state = initGameState(manifestRaw as MissionManifest, data)

startGame(data, state)
