import { describe, it, expect } from 'vitest'
import { handleTake, handleDrop, handleLoot } from '../../src/engine/inventory'
import type { GameData, ItemData } from '../../src/types/data'
import type { GameState, Inventory, RoomState, EnemyState } from '../../src/types/state'

const emptyInventory = (): Inventory => ({
  weapons: [null, null],
  gadgets: [null, null],
  small: [null, null, null],
  special: null,
})

const makeItem = (partial: Partial<ItemData> & { id: string }): ItemData => ({
  label: partial.id,
  description: '',
  type: 'keycard',
  ...partial,
})

const makeRoomState = (partial: Partial<RoomState> = {}): RoomState => ({
  id: 'room_a',
  itemIds: [],
  enemyIds: [],
  flags: {},
  visited: true,
  ...partial,
})

const makeState = (partial: Partial<GameState> = {}): GameState => ({
  protagonist: {
    currentRoom: 'room_a',
    previousRoomId: null,
    health: 10,
    stats: { strength: 5, agility: 5, intelligence: 5, charisma: 5 },
    skills: [],
    inventory: emptyInventory(),
    flags: {},
  },
  time: { elapsed: 0, missionDeadline: 100 },
  alarmLevel: 'undetected',
  roomStates: { room_a: makeRoomState() },
  enemyStates: {},
  itemStates: {},
  flags: {},
  ...partial,
})

const makeData = (items: ItemData[] = []): GameData => ({
  roomIndex: {},
  itemData: Object.fromEntries(items.map((i) => [i.id, i])),
  enemyTemplates: {},
  enemyData: {},
})

// --- handleTake ---

describe('handleTake', () => {
  it('picks up a keycard into the small slot', () => {
    const state = makeState({ roomStates: { room_a: makeRoomState({ itemIds: ['key_a'] }) } })
    const data = makeData([makeItem({ id: 'key_a', type: 'keycard', label: 'Security Keycard' })])
    const result = handleTake('key_a', state, data)

    expect(result.state.protagonist.inventory.small).toContain('key_a')
    expect(result.messages[0]).toMatch(/security keycard/i)
  })

  it('picks up a weapon into the weapons slot', () => {
    const state = makeState({ roomStates: { room_a: makeRoomState({ itemIds: ['pistol'] }) } })
    const data = makeData([makeItem({ id: 'pistol', type: 'weapon_ranged' })])
    const result = handleTake('pistol', state, data)

    expect(result.state.protagonist.inventory.weapons).toContain('pistol')
  })

  it('picks up a gadget into the gadgets slot', () => {
    const state = makeState({ roomStates: { room_a: makeRoomState({ itemIds: ['grapple'] }) } })
    const data = makeData([makeItem({ id: 'grapple', type: 'gadget' })])
    const result = handleTake('grapple', state, data)

    expect(result.state.protagonist.inventory.gadgets).toContain('grapple')
  })

  it('removes the item from the room', () => {
    const state = makeState({ roomStates: { room_a: makeRoomState({ itemIds: ['key_a'] }) } })
    const data = makeData([makeItem({ id: 'key_a', type: 'keycard' })])
    const result = handleTake('key_a', state, data)

    expect(result.state.roomStates['room_a'].itemIds).not.toContain('key_a')
  })

  it('fills slots in order — second item goes to next empty slot', () => {
    const state = makeState({
      protagonist: {
        ...makeState().protagonist,
        inventory: { ...emptyInventory(), weapons: ['pistol', null] },
      },
      roomStates: { room_a: makeRoomState({ itemIds: ['knife'] }) },
    })
    const data = makeData([makeItem({ id: 'knife', type: 'weapon_melee' })])
    const result = handleTake('knife', state, data)

    expect(result.state.protagonist.inventory.weapons).toEqual(['pistol', 'knife'])
  })

  it('fails when item is not in the room', () => {
    const state = makeState()
    const data = makeData([makeItem({ id: 'key_a', type: 'keycard' })])
    const result = handleTake('key_a', state, data)

    expect(result.state.protagonist.inventory.small).toEqual([null, null, null])
    expect(result.messages[0]).toMatch(/not here/i)
  })

  it('fails when the slot is full', () => {
    const state = makeState({
      protagonist: {
        ...makeState().protagonist,
        inventory: { ...emptyInventory(), weapons: ['pistol', 'knife'] },
      },
      roomStates: { room_a: makeRoomState({ itemIds: ['rifle'] }) },
    })
    const data = makeData([makeItem({ id: 'rifle', type: 'weapon_ranged' })])
    const result = handleTake('rifle', state, data)

    expect(result.state.protagonist.inventory.weapons).toEqual(['pistol', 'knife'])
    expect(result.messages[0]).toMatch(/full/i)
  })

  it('initialises ItemState for newly picked up item', () => {
    const state = makeState({ roomStates: { room_a: makeRoomState({ itemIds: ['key_a'] }) } })
    const data = makeData([makeItem({ id: 'key_a', type: 'keycard' })])
    const result = handleTake('key_a', state, data)

    expect(result.state.itemStates['key_a']).toEqual({ id: 'key_a', used: false, broken: false })
  })

  it('preserves existing ItemState when picking up item', () => {
    const state = makeState({
      roomStates: { room_a: makeRoomState({ itemIds: ['pistol'] }) },
      itemStates: { pistol: { id: 'pistol', used: true, broken: false } },
    })
    const data = makeData([makeItem({ id: 'pistol', type: 'weapon_ranged' })])
    const result = handleTake('pistol', state, data)

    expect(result.state.itemStates['pistol'].used).toBe(true)
  })
})

// --- handleDrop ---

describe('handleDrop', () => {
  it('drops an item from the small slot into the room', () => {
    const state = makeState({
      protagonist: {
        ...makeState().protagonist,
        inventory: { ...emptyInventory(), small: ['key_a', null, null] },
      },
    })
    const data = makeData([makeItem({ id: 'key_a', type: 'keycard', label: 'Keycard' })])
    const result = handleDrop('key_a', state, data)

    expect(result.state.protagonist.inventory.small).toEqual([null, null, null])
    expect(result.state.roomStates['room_a'].itemIds).toContain('key_a')
    expect(result.messages[0]).toMatch(/keycard/i)
  })

  it('drops a weapon from the weapons slot', () => {
    const state = makeState({
      protagonist: {
        ...makeState().protagonist,
        inventory: { ...emptyInventory(), weapons: ['pistol', null] },
      },
    })
    const data = makeData([makeItem({ id: 'pistol', type: 'weapon_ranged' })])
    const result = handleDrop('pistol', state, data)

    expect(result.state.protagonist.inventory.weapons).toEqual([null, null])
    expect(result.state.roomStates['room_a'].itemIds).toContain('pistol')
  })

  it('drops an item from the special slot', () => {
    const state = makeState({
      protagonist: {
        ...makeState().protagonist,
        inventory: { ...emptyInventory(), special: 'motorbike' },
      },
    })
    const data = makeData([makeItem({ id: 'motorbike', type: 'gadget', label: 'Motorbike' })])
    const result = handleDrop('motorbike', state, data)

    expect(result.state.protagonist.inventory.special).toBeNull()
    expect(result.state.roomStates['room_a'].itemIds).toContain('motorbike')
  })

  it('fails when item is not in inventory', () => {
    const state = makeState()
    const data = makeData([makeItem({ id: 'key_a', type: 'keycard' })])
    const result = handleDrop('key_a', state, data)

    expect(result.messages[0]).toMatch(/not carrying/i)
  })
})

// --- handleLoot ---

describe('handleLoot', () => {
  const makeEnemyState = (partial: Partial<EnemyState> = {}): EnemyState => ({
    id: 'guard_1',
    status: 'dead',
    inventory: [],
    ...partial,
  })

  it('loots an item from a dead enemy', () => {
    const state = makeState({
      enemyStates: { guard_1: makeEnemyState({ inventory: ['pistol'] }) },
    })
    const data: GameData = {
      ...makeData([makeItem({ id: 'pistol', type: 'weapon_ranged', label: 'Pistol' })]),
      enemyData: {
        guard_1: { id: 'guard_1', name: 'Boris', templateId: 'guard', roomId: 'room_a', inventory: ['pistol'] },
      },
    }
    const result = handleLoot('guard_1', 'pistol', state, data)

    expect(result.state.protagonist.inventory.weapons).toContain('pistol')
    expect(result.state.enemyStates['guard_1'].inventory).not.toContain('pistol')
    expect(result.messages[0]).toMatch(/boris/i)
  })

  it('loots an item from an unconscious enemy', () => {
    const state = makeState({
      enemyStates: { guard_1: makeEnemyState({ status: 'unconscious', inventory: ['keycard'] }) },
    })
    const data = makeData([makeItem({ id: 'keycard', type: 'keycard' })])
    const result = handleLoot('guard_1', 'keycard', state, data)

    expect(result.state.protagonist.inventory.small).toContain('keycard')
  })

  it('fails when enemy is still active', () => {
    const state = makeState({
      enemyStates: { guard_1: makeEnemyState({ status: 'active', inventory: ['pistol'] }) },
    })
    const data = makeData([makeItem({ id: 'pistol', type: 'weapon_ranged' })])
    const result = handleLoot('guard_1', 'pistol', state, data)

    expect(result.state.protagonist.inventory.weapons).toEqual([null, null])
    expect(result.messages[0]).toMatch(/still standing/i)
  })

  it('fails when item is not on the enemy', () => {
    const state = makeState({
      enemyStates: { guard_1: makeEnemyState({ inventory: [] }) },
    })
    const data = makeData([makeItem({ id: 'pistol', type: 'weapon_ranged' })])
    const result = handleLoot('guard_1', 'pistol', state, data)

    expect(result.messages[0]).toMatch(/not on them/i)
  })

  it('fails when inventory is full', () => {
    const state = makeState({
      protagonist: {
        ...makeState().protagonist,
        inventory: { ...emptyInventory(), weapons: ['gun_a', 'gun_b'] },
      },
      enemyStates: { guard_1: makeEnemyState({ inventory: ['rifle'] }) },
    })
    const data = makeData([makeItem({ id: 'rifle', type: 'weapon_ranged' })])
    const result = handleLoot('guard_1', 'rifle', state, data)

    expect(result.messages[0]).toMatch(/full/i)
    expect(result.state.enemyStates['guard_1'].inventory).toContain('rifle')
  })
})
