import { describe, expect, it } from 'vitest'
import { drawLineOnGrid, pointKey, runAStar, type GridPoint } from './pathfinding'

describe('pathfinding', () => {
  it('finds direct route when there are no obstacles', () => {
    const route = runAStar({ x: 1, y: 1 }, { x: 4, y: 1 }, new Set(), 10, 10)
    expect(route.length).toBeGreaterThan(0)
    expect(route[0]).toEqual({ x: 1, y: 1 })
    expect(route[route.length - 1]).toEqual({ x: 4, y: 1 })
  })

  it('detours around blocked line', () => {
    const blocked = new Set<string>()
    drawLineOnGrid({ x: 2, y: 0 }, { x: 2, y: 5 }, blocked)
    blocked.delete(pointKey({ x: 2, y: 0 }))
    blocked.delete(pointKey({ x: 2, y: 5 }))
    const route = runAStar({ x: 1, y: 1 }, { x: 4, y: 1 }, blocked, 10, 10)

    expect(route.length).toBeGreaterThan(0)
    const touchesBlocked = route.some((p: GridPoint) => blocked.has(pointKey(p)))
    expect(touchesBlocked).toBe(false)
  })

  it('returns empty route when goal is enclosed', () => {
    const blocked = new Set<string>([
      pointKey({ x: 3, y: 2 }),
      pointKey({ x: 2, y: 3 }),
      pointKey({ x: 4, y: 3 }),
      pointKey({ x: 3, y: 4 }),
    ])
    const route = runAStar({ x: 1, y: 1 }, { x: 3, y: 3 }, blocked, 10, 10)
    expect(route).toEqual([])
  })
})

