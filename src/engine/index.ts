import type { Action } from '../types/actions'
import type { GameData } from '../types/data'
import type { GameState } from '../types/state'
import type { SubSystemResult } from '../types/engine'
import { ACTION_COSTS } from '../constants'
import { handleMove } from './movement'
import { handleTake, handleDrop, handleLoot } from './inventory'
import { handleSearch } from './search'
import { handleAttack, handleStealthTakedown, handleFlee, guardAmbush } from './combat'
import { handleExamine } from './examine'
import { handleLook } from './look'
import { handleUse } from './use'
import { handleInteract } from './interact'
import { handleTalk } from './dialogue'
import { applyNoise } from './alarm'

export interface EngineResult {
  state: GameState
  messages: string[]
  gameOver?: 'dead' | 'timeout' | 'success'
}

export function processAction(
  action: Action,
  state: GameState,
  data: GameData,
): EngineResult {
  const result = dispatch(action, state, data)
  const messages = [...result.messages]

  // Alert guards in the destination room get a free attack when Jacob walks in
  let postMove = result.state
  if (action.type === 'move' && postMove.protagonist.currentRoom !== state.protagonist.currentRoom) {
    const { state: ambushed, messages: ambushMsgs } = guardAmbush(postMove, data)
    postMove = ambushed
    messages.push(...ambushMsgs)
  }

  const noised = result.noise
    ? {
        ...postMove,
        enemyStates: applyNoise(result.noise, postMove.protagonist.currentRoom, postMove, data),
      }
    : postMove

  const advanced = advanceTime(action.type, noised, result.timeCost)

  const { state: woken, messages: wakeMessages } = wakeEnemies(advanced, data)
  messages.push(...wakeMessages)

  const { state: finalState, gameOver } = checkDeadlines(woken)

  return { state: finalState, messages, gameOver }
}

function dispatch(
  action: Action,
  state: GameState,
  data: GameData,
): SubSystemResult {
  switch (action.type) {
    case 'move':
      return handleMove(action.exitLabel, state, data)
    case 'take':
      return handleTake(action.itemId, state, data)
    case 'drop':
      return handleDrop(action.itemId, state, data)
    case 'loot':
      return handleLoot(action.enemyId, action.itemId, state, data)
    case 'search':
      return handleSearch(state, data)
    case 'attack':
      return handleAttack(action.enemyId, state, data)
    case 'stealth_takedown':
      return handleStealthTakedown(action.enemyId, action.intent, state, data)
    case 'flee':
      return handleFlee(state, data)
    case 'examine':
      return handleExamine(action.targetId, state, data)
    case 'look':
      return handleLook(state, data)
    case 'use':
      return handleUse(action.itemId, state, data, action.targetId)
    case 'interact':
      return handleInteract(action.targetId, state, data)
    case 'talk':
      return handleTalk(action.enemyId, state, data)
  }
}

function advanceTime(actionType: string, state: GameState, timeCost?: number): GameState {
  const cost = timeCost ?? ACTION_COSTS[actionType] ?? 1
  return {
    ...state,
    time: { ...state.time, elapsed: state.time.elapsed + cost },
  }
}

function wakeEnemies(
  state: GameState,
  data: GameData,
): { state: GameState; messages: string[] } {
  const messages: string[] = []
  const updatedEnemyStates = { ...state.enemyStates }
  let changed = false

  for (const [id, enemyState] of Object.entries(updatedEnemyStates)) {
    if (
      enemyState.status === 'unconscious' &&
      enemyState.unconsciousUntil !== undefined &&
      state.time.elapsed >= enemyState.unconsciousUntil
    ) {
      updatedEnemyStates[id] = { ...enemyState, status: 'active', unconsciousUntil: undefined, awareness: 'alert' }
      const name = data.enemyData[id]?.name ?? 'Someone'
      messages.push(`${name} regains consciousness.`)
      changed = true
    }
  }

  return {
    state: changed ? { ...state, enemyStates: updatedEnemyStates } : state,
    messages,
  }
}

function checkDeadlines(state: GameState): {
  state: GameState
  gameOver?: 'dead' | 'timeout' | 'success'
} {
  if (state.time.elapsed >= state.time.missionDeadline) {
    return { state, gameOver: 'timeout' }
  }
  if (state.protagonist.health <= 0) {
    return { state, gameOver: 'dead' }
  }
  if (state.flags['mission_complete']) {
    return { state, gameOver: 'success' }
  }
  return { state }
}

