import type { GameData, ItemData, RoomData } from '../src/types/data'
import type { GameState, Inventory, RoomState } from '../src/types/state'

export const emptyInventory = (): Inventory => ({
  weapons: [null, null],
  gadgets: [null, null],
  small: [null, null, null],
  special: null,
})

export const makeRoom = (partial: Partial<RoomData> & { id: string }): RoomData => ({
  label: partial.id,
  description: `You are in ${partial.id}.`,
  addenda: [],
  exits: [],
  itemIds: [],
  hiddenItemIds: [],
  examineTargets: [],
  ...partial,
})

export const makeRoomState = (partial: Partial<RoomState> & { id?: string } = {}): RoomState => ({
  id: 'room_a',
  itemIds: [],
  enemyIds: [],
  flags: {},
  visited: false,
  ...partial,
})

export const makeState = (partial: Partial<GameState> = {}): GameState => {
  const { time: partialTime, ...rest } = partial
  return {
    protagonist: {
      currentRoom: 'room_a',
      previousRoomId: null,
      health: 10,
      maxHealth: 10,
      stats: { strength: 5, agility: 5, intelligence: 5, charisma: 5 },
      skills: [],
      inventory: emptyInventory(),
      flags: {},
    },
    time: { elapsed: 0, missionDeadline: 100, timerActive: true, ...partialTime },
    roomStates: {},
    enemyStates: {},
    itemStates: {},
    flags: {},
    ...rest,
  }
}

export const makeItem = (partial: Partial<ItemData> & { id: string }): ItemData => ({
  label: partial.id,
  description: '',
  type: 'keycard',
  ...partial,
})

export const makeGameData = (partial: Partial<GameData> = {}): GameData => ({
  roomIndex: {},
  itemData: {},
  enemyTemplates: {},
  enemyData: {},
  deadlineMessage: '',
  ...partial,
})

export const makeRoomsData = (rooms: RoomData[]): GameData =>
  makeGameData({ roomIndex: Object.fromEntries(rooms.map((r) => [r.id, r])) })

export const makeItemsData = (items: ItemData[]): GameData =>
  makeGameData({ itemData: Object.fromEntries(items.map((i) => [i.id, i])) })
