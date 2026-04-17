import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, Circle, Group, Line, Rect, Text } from 'fabric'
import jsPDF from 'jspdf'

type Tool = 'select' | 'wall' | 'socket' | 'switch' | 'lamp' | 'connect'
type SymbolKind = 'socket' | 'switch' | 'lamp'
type GridPoint = { x: number; y: number }

const GRID = 40
const WORKSPACE = 4000
const MATERIAL_LABEL: Record<SymbolKind, string> = {
  socket: 'Tomada 2P+T',
  switch: 'Interruptor simples',
  lamp: 'Ponto de luz',
}

const inBounds = (p: GridPoint, cols: number, rows: number) =>
  p.x >= 0 && p.y >= 0 && p.x < cols && p.y < rows

function key(p: GridPoint) {
  return `${p.x}:${p.y}`
}

function toGridPoint(x: number, y: number): GridPoint {
  return { x: Math.round(x / GRID), y: Math.round(y / GRID) }
}

function drawLineOnGrid(start: GridPoint, end: GridPoint, blocked: Set<string>) {
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
    blocked.add(key({ x: x0, y: y0 }))
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

function runAStar(
  start: GridPoint,
  goal: GridPoint,
  blocked: Set<string>,
  cols: number,
  rows: number,
): GridPoint[] {
  const open = new Set<string>([key(start)])
  const cameFrom = new Map<string, string>()
  const gScore = new Map<string, number>([[key(start), 0]])
  const fScore = new Map<string, number>([
    [key(start), Math.abs(start.x - goal.x) + Math.abs(start.y - goal.y)],
  ])
  const nodeByKey = new Map<string, GridPoint>([[key(start), start]])
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
      const nextKey = key(next)
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

function createSymbol(kind: SymbolKind, x: number, y: number) {
  const base = new Circle({
    radius: 18,
    fill: '#dbeafe',
    stroke: '#1d4ed8',
    strokeWidth: 2,
    originX: 'center',
    originY: 'center',
  })
  const glyph =
    kind === 'socket'
      ? new Rect({
          width: 18,
          height: 10,
          fill: '#1d4ed8',
          originX: 'center',
          originY: 'center',
        })
      : kind === 'switch'
        ? new Line([-8, 8, 8, -8], {
            stroke: '#1d4ed8',
            strokeWidth: 3,
            originX: 'center',
            originY: 'center',
          })
        : new Circle({
            radius: 8,
            fill: '#f59e0b',
            stroke: '#b45309',
            strokeWidth: 2,
            originX: 'center',
            originY: 'center',
          })

  const label = new Text(kind.toUpperCase(), {
    fontSize: 8,
    top: 22,
    originX: 'center',
    originY: 'center',
    fill: '#111827',
  })

  const group = new Group([base, glyph, label], {
    left: x,
    top: y,
    lockScalingFlip: true,
  })
  group.set('symbolKind', kind)
  group.set('isElectricalPoint', true)
  return group
}

function App() {
  const canvasEl = useRef<HTMLCanvasElement | null>(null)
  const canvasRef = useRef<Canvas | null>(null)
  const [tool, setTool] = useState<Tool>('select')
  const toolRef = useRef<Tool>('select')
  const [status, setStatus] = useState('Editor pronto.')
  const [selectedNodes, setSelectedNodes] = useState<Group[]>([])
  const wallStart = useRef<{ x: number; y: number } | null>(null)

  const tools = useMemo(
    () => [
      { id: 'select' as Tool, label: 'Selecionar' },
      { id: 'socket' as Tool, label: 'Tomada' },
      { id: 'switch' as Tool, label: 'Interruptor' },
      { id: 'lamp' as Tool, label: 'Lâmpada' },
      { id: 'wall' as Tool, label: 'Parede' },
      { id: 'connect' as Tool, label: 'Conectar A*' },
    ],
    [],
  )

  useEffect(() => {
    toolRef.current = tool
  }, [tool])

  useEffect(() => {
    if (!canvasEl.current) return
    const canvas = new Canvas(canvasEl.current, {
      width: window.innerWidth - 320,
      height: window.innerHeight - 24,
      backgroundColor: '#f8fafc',
      selection: true,
    })
    canvasRef.current = canvas

    for (let p = 0; p <= WORKSPACE; p += GRID) {
      const major = p % (GRID * 5) === 0
      canvas.add(
        new Line([p, 0, p, WORKSPACE], {
          stroke: major ? '#cbd5e1' : '#e2e8f0',
          strokeWidth: 1,
          selectable: false,
          evented: false,
        }),
      )
      canvas.add(
        new Line([0, p, WORKSPACE, p], {
          stroke: major ? '#cbd5e1' : '#e2e8f0',
          strokeWidth: 1,
          selectable: false,
          evented: false,
        }),
      )
    }

    canvas.on('mouse:down', (evt) => {
      const pointer = canvas.getScenePoint(evt.e)
      if (!pointer) return

      const activeTool = toolRef.current
      if (activeTool === 'socket' || activeTool === 'switch' || activeTool === 'lamp') {
        const symbol = createSymbol(activeTool, pointer.x, pointer.y)
        canvas.add(symbol)
        canvas.setActiveObject(symbol)
        setStatus(`${MATERIAL_LABEL[activeTool]} adicionada.`)
        return
      }

      if (activeTool === 'wall') {
        if (!wallStart.current) {
          wallStart.current = { x: pointer.x, y: pointer.y }
          setStatus('Ponto inicial da parede definido.')
          return
        }
        const wall = new Line([wallStart.current.x, wallStart.current.y, pointer.x, pointer.y], {
          stroke: '#374151',
          strokeWidth: 6,
          selectable: true,
        })
        wall.set('isWall', true)
        canvas.add(wall)
        wallStart.current = null
        setStatus('Parede criada como obstáculo.')
      }
    })

    return () => {
      canvas.dispose()
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.isDrawingMode = false
    canvas.selection = tool === 'select'
  }, [tool])

  const clearAll = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const all = canvas.getObjects().filter((o) => o.get('evented') !== false)
    all.forEach((obj) => canvas.remove(obj))
    setSelectedNodes([])
    setStatus('Projeto limpo.')
  }

  const selectNode = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const active = canvas.getActiveObject()
    if (!active || !active.get('isElectricalPoint')) {
      setStatus('Selecione um símbolo elétrico.')
      return
    }
    const next = [...selectedNodes, active as Group].slice(-2)
    setSelectedNodes(next)
    setStatus(`Pontos selecionados: ${next.length}/2`)
  }

  const connectSelected = () => {
    const canvas = canvasRef.current
    if (!canvas || selectedNodes.length < 2) {
      setStatus('Selecione dois pontos antes de conectar.')
      return
    }

    const [a, b] = selectedNodes
    const aCenter = a.getCenterPoint()
    const bCenter = b.getCenterPoint()
    const start = toGridPoint(aCenter.x, aCenter.y)
    const end = toGridPoint(bCenter.x, bCenter.y)
    const blocked = new Set<string>()

    canvas
      .getObjects()
      .filter((obj) => obj.get('isWall'))
      .forEach((wall) => {
        const asLine = wall as Line
        const x1 = Number(asLine.x1 ?? 0) + Number(asLine.left ?? 0)
        const y1 = Number(asLine.y1 ?? 0) + Number(asLine.top ?? 0)
        const x2 = Number(asLine.x2 ?? 0) + Number(asLine.left ?? 0)
        const y2 = Number(asLine.y2 ?? 0) + Number(asLine.top ?? 0)
        drawLineOnGrid(toGridPoint(x1, y1), toGridPoint(x2, y2), blocked)
      })

    blocked.delete(key(start))
    blocked.delete(key(end))
    const path = runAStar(start, end, blocked, WORKSPACE / GRID, WORKSPACE / GRID)

    if (!path.length) {
      setStatus('Não foi possível encontrar rota sem cruzar paredes.')
      return
    }

    for (let i = 0; i < path.length - 1; i += 1) {
      const from = path[i]
      const to = path[i + 1]
      const duct = new Line(
        [from.x * GRID, from.y * GRID, to.x * GRID, to.y * GRID],
        { stroke: '#059669', strokeWidth: 3, selectable: false },
      )
      duct.set('isDuct', true)
      canvas.add(duct)
    }
    setStatus(`Conexão criada com ${path.length - 1} segmentos.`)
    canvas.renderAll()
  }

  const exportMaterials = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const counts: Record<string, number> = {}
    canvas
      .getObjects()
      .filter((o) => o.get('isElectricalPoint'))
      .forEach((o) => {
        const kind = String(o.get('symbolKind'))
        counts[kind] = (counts[kind] ?? 0) + 1
      })

    const payload = {
      generatedAt: new Date().toISOString(),
      project: 'WOCA Cursor Clone',
      materials: Object.entries(counts).map(([kind, total]) => ({
        code: kind,
        description: MATERIAL_LABEL[kind as SymbolKind] ?? kind,
        total,
      })),
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'lista-materiais.json'
    a.click()
    URL.revokeObjectURL(url)
    setStatus('Lista de materiais exportada em JSON.')
  }

  const exportPdf = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const image = canvas.toDataURL({ format: 'png', multiplier: 1 })
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1400, 900] })
    pdf.text('WOCA Cursor Clone - Planta Elétrica', 24, 28)
    pdf.addImage(image, 'PNG', 20, 40, 1360, 840)
    pdf.save('planta-eletrica.pdf')
    setStatus('PDF exportado com sucesso.')
  }

  return (
    <div className="flex h-screen w-screen gap-4 p-3 text-slate-100">
      <aside className="w-72 rounded-xl bg-slate-900/90 p-4 shadow-xl">
        <h1 className="mb-2 text-lg font-semibold">WOCA Clone (Base)</h1>
        <p className="mb-4 text-xs text-slate-400">Grid 10cm | Fabric.js | A* para eletroduto</p>

        <div className="mb-4 grid grid-cols-2 gap-2">
          {tools.map((entry) => (
            <button
              key={entry.id}
              onClick={() => setTool(entry.id)}
              className={`rounded-md px-2 py-2 text-xs font-medium ${
                tool === entry.id ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-200'
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <button onClick={selectNode} className="w-full rounded-md bg-slate-700 px-3 py-2 text-sm">
            Selecionar ponto para conexão
          </button>
          <button onClick={connectSelected} className="w-full rounded-md bg-emerald-600 px-3 py-2 text-sm">
            Conectar dois pontos (A*)
          </button>
          <button onClick={exportPdf} className="w-full rounded-md bg-amber-600 px-3 py-2 text-sm">
            Exportar PDF
          </button>
          <button onClick={exportMaterials} className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm">
            Exportar materiais JSON
          </button>
          <button onClick={clearAll} className="w-full rounded-md bg-rose-700 px-3 py-2 text-sm">
            Limpar projeto
          </button>
        </div>

        <div className="mt-4 rounded-md bg-slate-800 p-3 text-xs text-slate-300">
          <strong>Status:</strong> {status}
        </div>
      </aside>

      <main className="flex-1 overflow-hidden rounded-xl bg-white p-2">
        <canvas ref={canvasEl} />
      </main>
    </div>
  )
}

export default App
