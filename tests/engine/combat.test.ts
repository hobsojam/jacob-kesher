import { describe, it, expect } from 'vitest'
import { handleAttack, handleStealthTakedown, handleFlee } from '../../src/engine/combat'
import { processAction } from '../../src/engine/index'
import type { GameData, EnemyData, EnemyTemplate } from '../../src/types/data'
import type { GameState } from '../../src/types/state'
import { makeState, makeGameData, emptyInventory } from '../helpers'

const alwaysHit = () => 20
const alwaysMiss = () => 1

const makeTemplate = (partial: Partial<EnemyTemplate> = {}): EnemyTemplate => ({
  id: 'guard',
  type: 'guard',
  stats: { strength: 3, agility: 3, health: 1 },
  detectionRadius: 1,
  canBeBluffed: true,
  canBeDisguised: true,
  wakeAfterTurns: 10,
  ...partial,
})

const makeEnemy = (partial: Partial<EnemyData> = {}): EnemyData => ({
  id: 'guard_1',
  name: 'Boris',
  templateId: 'guard',
  roomId: 'room_a',
  inventory: [],
  ...partial,
})

const makeData = (partial: Partial<GameData> = {}): GameData =>
  makeGameData({
    enemyTemplates: { guard: makeTemplate() },
    enemyData: { guard_1: makeEnemy() },
    ...partial,
  })

// --- handleAttack ---

describe('handleAttack', () => {
  it('kills a mook on a hit', () => {
    const result = handleAttack('guard_1', makeState(), makeData(), alwaysHit)

    expect(result.state.enemyStates['guard_1'].status).toBe('dead')
    expect(result.messages.some((m) => /goes down/i.test(m))).toBe(true)
  })

  it('does not counterattack when enemy is killed', () => {
    const result = handleAttack('guard_1', makeState(), makeData(), alwaysHit)

    expect(result.messages.some((m) => /retaliates/i.test(m))).toBe(false)
    expect(result.state.protagonist.health).toBe(10)
  })

  it('decrements health without killing a tough enemy', () => {
    const data = makeData({
      enemyTemplates: { guard: makeTemplate({ stats: { strength: 3, agility: 3, health: 3 } }) },
    })
    const result = handleAttack('guard_1', makeState(), data, alwaysHit)

    expect(result.state.enemyStates['guard_1'].status).toBe('active')
    expect(result.state.enemyStates['guard_1'].health).toBe(2)
  })

  it('enemy counterattacks when Jacob misses', () => {
    // alwaysMiss (1+5=6) vs enemy defence (10+3=13) → miss
    // enemy attack (1+3=4) vs Jacob defence (10+5=15) → also miss
    const result = handleAttack('guard_1', makeState(), makeData(), alwaysMiss)

    expect(result.messages.some((m) => /retaliates/i.test(m))).toBe(true)
    expect(result.state.protagonist.health).toBe(10) // enemy also missed
  })

  it('enemy counterattacks when Jacob hits but enemy survives', () => {
    const data = makeData({
      enemyTemplates: { guard: makeTemplate({ stats: { strength: 3, agility: 3, health: 3 } }) },
    })
    const result = handleAttack('guard_1', makeState(), data, alwaysHit)

    expect(result.messages.some((m) => /retaliates/i.test(m))).toBe(true)
  })

  it('enemy hit reduces Jacob health by 1', () => {
    // Force enemy to always hit: need high enemy strength + low Jacob agility
    const state = makeState({
      protagonist: {
        ...makeState().protagonist,
        stats: { strength: 5, agility: 0, intelligence: 5, charisma: 5 },
      },
    })
    // alwaysMiss for Jacob's attack, alwaysHit for enemy
    // We need alternating rolls: miss for Jacob, hit for enemy
    const rolls = [1, 20]
    let i = 0
    const alternatingRoll = () => rolls[i++ % 2]

    const result = handleAttack('guard_1', state, makeData(), alternatingRoll)

    expect(result.state.protagonist.health).toBe(9)
    expect(result.messages.some((m) => /you are hit/i.test(m))).toBe(true)
  })

  it('uses ranged weapon and produces alarming noise', () => {
    const state = makeState({
      protagonist: {
        ...makeState().protagonist,
        inventory: { ...emptyInventory(), weapons: ['pistol', null] },
      },
    })
    const data = makeData({
      itemData: { pistol: { id: 'pistol', label: 'Pistol', description: '', type: 'weapon_ranged' } },
    })
    const result = handleAttack('guard_1', state, data, alwaysHit)

    expect(result.noise).toBe('alarming')
    expect(result.messages[0]).toMatch(/pistol/i)
  })

  it('ranged weapon with damage:2 deals 2 HP to a tough enemy', () => {
    const state = makeState({
      protagonist: {
        ...makeState().protagonist,
        inventory: { ...emptyInventory(), weapons: ['pistol', null] },
      },
    })
    const data = makeData({
      itemData: { pistol: { id: 'pistol', label: 'Pistol', description: '', type: 'weapon_ranged', damage: 2 } },
      enemyTemplates: { guard: makeTemplate({ stats: { strength: 3, agility: 3, health: 3 } }) },
    })
    const result = handleAttack('guard_1', state, data, alwaysHit)

    expect(result.state.enemyStates['guard_1'].status).toBe('active')
    expect(result.state.enemyStates['guard_1'].health).toBe(1)
  })

  it('ranged weapon with damage:2 kills an enemy at exactly 2 HP', () => {
    const state = makeState({
      protagonist: {
        ...makeState().protagonist,
        inventory: { ...emptyInventory(), weapons: ['pistol', null] },
      },
      enemyStates: { guard_1: { id: 'guard_1', status: 'active', health: 2, inventory: [] } },
    })
    const data = makeData({
      itemData: { pistol: { id: 'pistol', label: 'Pistol', description: '', type: 'weapon_ranged', damage: 2 } },
    })
    const result = handleAttack('guard_1', state, data, alwaysHit)

    expect(result.state.enemyStates['guard_1'].status).toBe('dead')
    expect(result.messages.some((m) => /goes down/i.test(m))).toBe(true)
  })

  it('unarmed and melee with no damage field default to 1 HP', () => {
    const data = makeData({
      enemyTemplates: { guard: makeTemplate({ stats: { strength: 3, agility: 3, health: 3 } }) },
    })
    const result = handleAttack('guard_1', makeState(), data, alwaysHit)

    expect(result.state.enemyStates['guard_1'].health).toBe(2)
  })

  it('falls back to melee weapon when ranged is used/broken', () => {
    const state = makeState({
      protagonist: {
        ...makeState().protagonist,
        inventory: { ...emptyInventory(), weapons: ['pistol', 'knife'] },
      },
      itemStates: { pistol: { id: 'pistol', used: true, broken: false } },
    })
    const data = makeData({
      itemData: {
        pistol: { id: 'pistol', label: 'Pistol', description: '', type: 'weapon_ranged' },
        knife: { id: 'knife', label: 'Knife', description: '', type: 'weapon_melee' },
      },
    })
    const result = handleAttack('guard_1', state, data, alwaysHit)

    expect(result.noise).toBe('loud')
    expect(result.messages[0]).toMatch(/knife/i)
  })

  it('fights unarmed when no weapons available', () => {
    const result = handleAttack('guard_1', makeState(), makeData(), alwaysHit)

    expect(result.noise).toBe('quiet')
    expect(result.messages[0]).toMatch(/bare hands/i)
  })

  it('applies hand_to_hand skill bonus to melee attack', () => {
    const state = makeState({
      protagonist: {
        ...makeState().protagonist,
        stats: { strength: 0, agility: 5, intelligence: 5, charisma: 5 },
        skills: [{ id: 'hand_to_hand', label: 'Hand to Hand', level: 5 }],
      },
    })
    // With strength 0 + skill 5 + roll 1 = 6 vs enemy defence 10+3=13 → miss
    // With strength 0 + no skill + roll 1 = 1 → also miss, but with skill=5, roll=8 → hit
    // Let's test that skill is included: force a specific roll scenario
    // strength=0, skill=5, roll=8 → 13 >= 13 → hit
    const result = handleAttack('guard_1', state, makeData(), () => 8)

    expect(result.state.enemyStates['guard_1'].status).toBe('dead')
  })

  it('blocks attacking an already dead enemy', () => {
    const state = makeState({
      enemyStates: { guard_1: { id: 'guard_1', status: 'dead', inventory: [] } },
    })
    const result = handleAttack('guard_1', state, makeData(), alwaysHit)

    expect(result.messages[0]).toMatch(/already down/i)
  })

  it('blocks attacking an unconscious enemy', () => {
    const state = makeState({
      enemyStates: { guard_1: { id: 'guard_1', status: 'unconscious', inventory: [] } },
    })
    const result = handleAttack('guard_1', state, makeData(), alwaysHit)

    expect(result.messages[0]).toMatch(/already down/i)
  })

  it('returns not found for unknown enemy', () => {
    const result = handleAttack('nobody', makeState(), makeData(), alwaysHit)

    expect(result.messages[0]).toMatch(/no one to attack/i)
  })
})

// --- handleStealthTakedown ---

describe('handleStealthTakedown', () => {
  it('neutralises enemy — sets status to unconscious', () => {
    const result = handleStealthTakedown('guard_1', 'neutralise', makeState(), makeData())

    expect(result.state.enemyStates['guard_1'].status).toBe('unconscious')
  })

  it('sets unconsciousUntil based on template wakeAfterTurns', () => {
    const state = makeState({ time: { elapsed: 5, missionDeadline: 100 } })
    const result = handleStealthTakedown('guard_1', 'neutralise', state, makeData())

    expect(result.state.enemyStates['guard_1'].unconsciousUntil).toBe(15) // 5 + 10
  })

  it('kills enemy on kill intent', () => {
    const result = handleStealthTakedown('guard_1', 'kill', makeState(), makeData())

    expect(result.state.enemyStates['guard_1'].status).toBe('dead')
  })

  it('is always silent', () => {
    const neutralise = handleStealthTakedown('guard_1', 'neutralise', makeState(), makeData())
    const kill = handleStealthTakedown('guard_1', 'kill', makeState(), makeData())

    expect(neutralise.noise).toBe('silent')
    expect(kill.noise).toBe('silent')
  })

  it('blocks taking down a dead enemy', () => {
    const state = makeState({
      enemyStates: { guard_1: { id: 'guard_1', status: 'dead', inventory: [] } },
    })
    const result = handleStealthTakedown('guard_1', 'neutralise', state, makeData())

    expect(result.messages[0]).toMatch(/already down/i)
  })

  it('does not reduce Jacob health', () => {
    const result = handleStealthTakedown('guard_1', 'kill', makeState(), makeData())

    expect(result.state.protagonist.health).toBe(10)
  })

  it('blocks takedown when guard is suspicious', () => {
    const state = makeState({
      enemyStates: { guard_1: { id: 'guard_1', status: 'active', inventory: [], awareness: 'suspicious' } },
    })
    const result = handleStealthTakedown('guard_1', 'neutralise', state, makeData())

    expect(result.state.enemyStates['guard_1']?.status).not.toBe('unconscious')
    expect(result.messages[0]).toMatch(/aware of you/i)
  })

  it('blocks takedown when guard is alert', () => {
    const state = makeState({
      enemyStates: { guard_1: { id: 'guard_1', status: 'active', inventory: [], awareness: 'alert' } },
    })
    const result = handleStealthTakedown('guard_1', 'kill', state, makeData())

    expect(result.state.enemyStates['guard_1']?.status).not.toBe('dead')
    expect(result.messages[0]).toMatch(/aware of you/i)
  })

  it('allows takedown when guard has no enemyState (default unaware)', () => {
    const result = handleStealthTakedown('guard_1', 'neutralise', makeState(), makeData())

    expect(result.state.enemyStates['guard_1'].status).toBe('unconscious')
  })
})

// --- handleFlee ---

describe('handleFlee', () => {
  const stateWithPrevRoom = (): GameState =>
    makeState({ protagonist: { ...makeState().protagonist, previousRoomId: 'room_b' } })

  it('moves Jacob to previousRoomId', () => {
    const result = handleFlee(stateWithPrevRoom(), makeData())

    expect(result.state.protagonist.currentRoom).toBe('room_b')
  })

  it('sets previousRoomId to the room Jacob fled from', () => {
    const result = handleFlee(stateWithPrevRoom(), makeData())

    expect(result.state.protagonist.previousRoomId).toBe('room_a')
  })

  it('fails when there is no previousRoomId', () => {
    const result = handleFlee(makeState(), makeData())

    expect(result.state.protagonist.currentRoom).toBe('room_a')
    expect(result.messages[0]).toMatch(/nowhere to run/i)
  })

  it('produces quiet noise', () => {
    const result = handleFlee(stateWithPrevRoom(), makeData())

    expect(result.noise).toBe('quiet')
  })
})

// --- wakeEnemies (via processAction) ---

describe('wakeEnemies', () => {
  it('revives an unconscious guard as alert when the turn threshold is reached', () => {
    const state = makeState({
      time: { elapsed: 5, missionDeadline: 100 },
      enemyStates: {
        guard_1: { id: 'guard_1', status: 'unconscious', unconsciousUntil: 5, inventory: [] },
      },
    })
    const result = processAction({ type: 'look' }, state, makeData())

    expect(result.state.enemyStates['guard_1'].status).toBe('active')
    expect(result.state.enemyStates['guard_1'].awareness).toBe('alert')
  })
})
