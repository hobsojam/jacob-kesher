import type { RoomData } from '../types/data'

// BFS over exits (ignoring lock requirements — sound/pursuit don't check doors)
export function roomDistance(fromId: string, toId: string, roomIndex: Record<string, RoomData>): number {
  if (fromId === toId) return 0
  const visited = new Set<string>()
  const queue: Array<{ id: string; dist: number }> = [{ id: fromId, dist: 0 }]
  while (queue.length > 0) {
    const { id, dist } = queue.shift()!
    if (visited.has(id)) continue
    visited.add(id)
    const room = roomIndex[id]
    if (!room) continue
    for (const exit of room.exits) {
      if (exit.destinationId === toId) return dist + 1
      if (!visited.has(exit.destinationId)) {
        queue.push({ id: exit.destinationId, dist: dist + 1 })
      }
    }
  }
  return Infinity
}

// First hop of the shortest path from fromId to toId, or null if unreachable/already there.
export function nextStepToward(
  fromId: string,
  toId: string,
  roomIndex: Record<string, RoomData>,
): string | null {
  if (fromId === toId) return null
  const cameFrom = new Map<string, string>()
  const visited = new Set<string>([fromId])
  const queue: string[] = [fromId]

  while (queue.length > 0) {
    const id = queue.shift()!
    const room = roomIndex[id]
    if (!room) continue
    for (const exit of room.exits) {
      if (visited.has(exit.destinationId)) continue
      visited.add(exit.destinationId)
      cameFrom.set(exit.destinationId, id)
      if (exit.destinationId === toId) {
        // Backtrack to the step right after fromId
        let step = toId
        while (cameFrom.get(step) !== fromId) {
          step = cameFrom.get(step)!
        }
        return step
      }
      queue.push(exit.destinationId)
    }
  }
  return null
}
