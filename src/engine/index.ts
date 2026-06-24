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
import { checkDetection } from './detection'
import { checkDisguise } from './disguise'
import { checkDiscoveries } from './discovery'
import { checkReveals } from './reveals'
import { initEnemyState, enemyLabel, cap } from './room'

export interface EngineResult {
  state: GameState
  messages: string[]
  gameOver?: 'dead' | 'timeout' | 'success' | 'failed'
}

export function processAction(
  action: Action,
  state: GameState,
  data: GameData,
): EngineResult {
  const result = dispatch(action, state, data)
  const messages = [...result.messages]

  const moved =
    action.type === 'move' &&
    result.state.protagonist.currentRoom !== state.protagonist.currentRoom

  // Movement triggers a proximity check: nearby guards may hear Jacob enter
  let afterProximity = result.state
  if (moved) {
    const covertLevel = result.state.protagonist.skills?.find((sk) => sk.id === 'covert')?.level ?? 0
    const { state: s, messages: m } = checkDetection(
      'quiet',
      result.state.protagonist.currentRoom,
      result.state,
      data,
      undefined,
      covertLevel,
    )
    afterProximity = s
    messages.push(...m)
  }

  // Noise from the action reaches guards within their detection radius
  let afterNoise = afterProximity
  if (result.noise) {
    const { state: s, messages: m } = checkDetection(
      result.noise,
      afterProximity.protagonist.currentRoom,
      afterProximity,
      data,
    )
    afterNoise = s
    messages.push(...m)
  }

  // Disguise check: guards in the same room roll against Jacob's uniform.
  // Success resets awareness (guard accepts the disguise); failure sets alert
  // and blows the cover. Runs after sound detection so it can override it.
  let afterDisguise = afterNoise
  if (afterNoise.flags['wearing_uniform']) {
    const { state: s, messages: m } = checkDisguise(afterNoise, data)
    afterDisguise = s
    messages.push(...m)
  }

  // Alert guards in the room get a free attack — after disguise may have de-escalated
  let afterAmbush = afterDisguise
  if (moved || action.type === 'talk' || action.type === 'search') {
    const { state: s, messages: m } = guardAmbush(afterDisguise, data)
    afterAmbush = s
    messages.push(...m)
  }

  // Promote hidden items unblocked by room flags set this turn
  const revealed = checkReveals(afterAmbush, data)

  const effectiveCost = result.timeCost ?? ACTION_COSTS[action.type] ?? 1
  const advanced = advanceTime(action.type, revealed, result.timeCost)

  const { state: woken, messages: wakeMessages } = wakeEnemies(advanced, data)
  messages.push(...wakeMessages)

  // Only roll for discovery on turns where time actually advances; zero-cost
  // actions (drop) must not independently accumulate discovery risk
  let afterDiscovery = woken
  if (effectiveCost > 0) {
    const { state: s, messages: m } = checkDiscoveries(woken, data)
    afterDiscovery = s
    messages.push(...m)
  }

  const { state: finalState, messages: deadlineMessages, gameOver } = checkDeadlines(afterDiscovery, data)
  messages.push(...deadlineMessages)

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
  if (state.time.timerActive === false) return state
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
  const updatedRoomStates = { ...state.roomStates }
  let changed = false

  for (const [id, enemyState] of Object.entries(updatedEnemyStates)) {
    if (
      enemyState.status === 'unconscious' &&
      enemyState.unconsciousUntil !== undefined &&
      state.time.elapsed >= enemyState.unconsciousUntil
    ) {
      updatedEnemyStates[id] = { ...enemyState, status: 'active', unconsciousUntil: undefined, awareness: 'alert' }
      const enemy = data.enemyData[id]
      const name = enemy ? cap(enemyLabel(enemy, data)) : 'Someone'
      messages.push(`${name} regains consciousness.`)
      changed = true
      // Remove from any room's stationary list — they resume patrol-based positioning
      for (const roomId of Object.keys(updatedRoomStates)) {
        const rs = updatedRoomStates[roomId]
        if (rs.enemyIds.includes(id)) {
          updatedRoomStates[roomId] = { ...rs, enemyIds: rs.enemyIds.filter((eid) => eid !== id) }
        }
      }
    }
  }

  return {
    state: changed ? { ...state, enemyStates: updatedEnemyStates, roomStates: updatedRoomStates } : state,
    messages,
  }
}

function checkDeadlines(
  state: GameState,
  data: GameData,
): { state: GameState; messages: string[]; gameOver?: 'dead' | 'timeout' | 'success' | 'failed' } {
  if (state.protagonist.health <= 0) {
    return { state, messages: [], gameOver: 'dead' }
  }
  if (state.flags['mission_complete']) {
    return { state, messages: [], gameOver: 'success' }
  }
  if (state.flags['mission_failed']) {
    return { state, messages: [], gameOver: 'failed' }
  }
  if (state.time.timerActive !== false && state.time.elapsed >= state.time.missionDeadline && !state.flags['deadline_passed']) {
    const updatedEnemyStates = { ...state.enemyStates }
    for (const enemy of Object.values(data.enemyData)) {
      const es = updatedEnemyStates[enemy.id]
      if (es && es.status !== 'active') continue
      updatedEnemyStates[enemy.id] = {
        ...(es ?? initEnemyState(enemy)),
        awareness: 'alert',
      }
    }
    return {
      state: {
        ...state,
        enemyStates: updatedEnemyStates,
        flags: { ...state.flags, alarm_raised: true, deadline_passed: true },
      },
      messages: [data.deadlineMessage],
    }
  }
  return { state, messages: [] }
}

