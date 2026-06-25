import './style.css'
import { buildGameData, initGameState } from './data/loader'
import { startGame } from './renderer/index'
import { showCharGen } from './renderer/chargen'
import { showMissionSelect } from './renderer/mission-select'

import type { EnemyTemplate, ItemData, RoomData } from './types/data'
import type { MissionManifest } from './types/mission'

import m01Map from './data/missions/mission-01/map.json'
import m01Items from './data/missions/mission-01/items.json'
import m01Enemies from './data/missions/mission-01/enemies.json'
import m01Manifest from './data/missions/mission-01/manifest.json'

import m02Map from './data/missions/mission-02/map.json'
import m02Items from './data/missions/mission-02/items.json'
import m02Enemies from './data/missions/mission-02/enemies.json'
import m02Manifest from './data/missions/mission-02/manifest.json'

import templatesRaw from './data/templates.json'

const missions = [
  { manifest: m01Manifest, map: m01Map, items: m01Items, enemies: m01Enemies },
  { manifest: m02Manifest, map: m02Map, items: m02Items, enemies: m02Enemies },
]

showMissionSelect(
  missions.map((m) => ({
    id: m.manifest.id,
    title: m.manifest.title,
    description: m.manifest.description,
    deadline: m.manifest.missionDeadline,
  })),
  (selectedId) => {
    const mission = missions.find((m) => m.manifest.id === selectedId)!
    const data = buildGameData(
      mission.map.rooms as RoomData[],
      mission.items.items as ItemData[],
      mission.enemies.enemies,
      templatesRaw.templates as EnemyTemplate[],
      mission.manifest as MissionManifest,
    )
    const state = initGameState(mission.manifest as MissionManifest, data)
    showCharGen(data, state, (finalState) => startGame(data, finalState))
  },
)
