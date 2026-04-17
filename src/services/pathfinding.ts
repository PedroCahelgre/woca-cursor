export type GridPoint = { x: number; y: number }

export function pointKey(p: GridPoint) {
  return `${p.x}:${p.y}`
}

export function inBounds(p: GridPoint, cols: number, rows: number) {
  return p.x >= 0 && p.y >= 0 && p.x < cols && p.y < rows
}

export function drawLineOnGrid(start: GridPoint, end: GridPoint, blocked: Set<string>) {
  let x0 = start.x
  let y0 = start.y
  const x1 = end.x
  const y1 = end.y

  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx - dy

  while (true) {
    blocked.add(pointKey({ x: x0, y: y0 }))
    if (x0 === x1 && y0 === y1) break
    const e2 = 2 * err
    if (e2 > -dy) {
      err -= dy
      x0 += sx
    }
    if (e2 < dx) {
      err += dx
      y0 += sy
    }
  }
}

export function runAStar(
  start: GridPoint,
  goal: GridPoint,
  blocked: Set<string>,
  cols: number,
  rows: number,
): GridPoint[] {
  const open = new Set<string>([pointKey(start)])
  const cameFrom = new Map<string, string>()
  const gScore = new Map<string, number>([[pointKey(start), 0]])
  const fScore = new Map<string, number>([
    [pointKey(start), Math.abs(start.x - goal.x) + Math.abs(start.y - goal.y)],
  ])
  const nodeByKey = new Map<string, GridPoint>([[pointKey(start), start]])
  const neighbors = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ]

  while (open.size > 0) {
    const currentKey = [...open].sort((a, b) => (fScore.get(a) ?? Infinity) - (fScore.get(b) ?? Infinity))[0]
    const current = nodeByKey.get(currentKey)
    if (!current) break

    if (current.x === goal.x && current.y === goal.y) {
      const route: GridPoint[] = [goal]
      let cursor = currentKey
      while (cameFrom.has(cursor)) {
        const prevKey = cameFrom.get(cursor)!
        const [x, y] = prevKey.split(':').map(Number)
        route.push({ x, y })
        cursor = prevKey
      }
      return route.reverse()
    }

    open.delete(currentKey)

    for (const n of neighbors) {
      const next = { x: current.x + n.x, y: current.y + n.y }
      const nextKey = pointKey(next)
      if (!inBounds(next, cols, rows) || blocked.has(nextKey)) continue
      const tentative = (gScore.get(currentKey) ?? Infinity) + 1

      if (tentative < (gScore.get(nextKey) ?? Infinity)) {
        cameFrom.set(nextKey, currentKey)
        gScore.set(nextKey, tentative)
        fScore.set(nextKey, tentative + Math.abs(next.x - goal.x) + Math.abs(next.y - goal.y))
        nodeByKey.set(nextKey, next)
        open.add(nextKey)
      }
    }
  }

  return []
}

