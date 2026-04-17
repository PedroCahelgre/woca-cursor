import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, Circle, Group, Line, Rect, Text, loadSVGFromString } from 'fabric'
import jsPDF from 'jspdf'
import {
  ElectricalCalculator,
  type InstallationMethod,
  type MaterialType,
} from './services/electricalCalculator'
import { drawLineOnGrid, pointKey, runAStar, type GridPoint } from './services/pathfinding'
import { SYMBOL_SVG_LIBRARY } from './data/symbolLibrary'
import { PROJECT_TEMPLATES } from './data/projectTemplates'
import type { SymbolKind } from './types/symbols'

type Tool = 'select' | 'wall' | 'connect'

const GRID = 40
const WORKSPACE = 4000
const CANVAS_WIDTH = 1800
const CANVAS_HEIGHT = 1100
const MATERIAL_LABEL: Record<SymbolKind, string> = {
  socket: 'Tomada 2P+T',
  switch: 'Interruptor simples',
  lamp: 'Ponto de luz',
}
const METER_PER_GRID = 0.1
const DEFAULT_CIRCUIT = 'C1'

function toGridPoint(x: number, y: number): GridPoint {
  return { x: Math.round(x / GRID), y: Math.round(y / GRID) }
}

function createFallbackSymbol(kind: SymbolKind, x: number, y: number) {
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

async function createSymbolFromSvg(
  kind: SymbolKind,
  svgSource: string,
  x: number,
  y: number,
  circuitId: string,
) {
  try {
    const parsed = await loadSVGFromString(svgSource)
    const objects = parsed.objects.filter((obj): obj is NonNullable<typeof obj> => obj !== null)
    const group = new Group(objects, {
      left: x,
      top: y,
      originX: 'center',
      originY: 'center',
      lockScalingFlip: true,
      scaleX: 0.8,
      scaleY: 0.8,
    })
    const label = new Text(`${kind.toUpperCase()} ${circuitId}`, {
      fontSize: 8,
      top: 26,
      originX: 'center',
      originY: 'center',
      fill: '#111827',
    })
    const wrapper = new Group([group, label], {
      left: x,
      top: y,
      originX: 'center',
      originY: 'center',
      lockScalingFlip: true,
    })
    wrapper.set('symbolKind', kind)
    wrapper.set('isElectricalPoint', true)
    wrapper.set('circuitId', circuitId)
    return wrapper
  } catch {
    const fallback = createFallbackSymbol(kind, x, y)
    fallback.set('circuitId', circuitId)
    return fallback
  }
}

function App() {
  const canvasEl = useRef<HTMLCanvasElement | null>(null)
  const canvasRef = useRef<Canvas | null>(null)
  const [tool, setTool] = useState<Tool>('select')
  const toolRef = useRef<Tool>('select')
  const [status, setStatus] = useState('Editor pronto.')
  const [selectedNodes, setSelectedNodes] = useState<Group[]>([])
  const wallStart = useRef<{ x: number; y: number } | null>(null)
  const dragging = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const [zoomPercent, setZoomPercent] = useState(100)
  const [calcWatts, setCalcWatts] = useState(1500)
  const [calcDistance, setCalcDistance] = useState(24)
  const [calcVoltage, setCalcVoltage] = useState(220)
  const [calcMethod, setCalcMethod] = useState<InstallationMethod>('B1')
  const [calcMaterial, setCalcMaterial] = useState<MaterialType>('copper')
  const [activeCircuit, setActiveCircuit] = useState(DEFAULT_CIRCUIT)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const symbolImportRef = useRef<HTMLInputElement | null>(null)
  const symbolBatchImportRef = useRef<HTMLInputElement | null>(null)
  const [customSvgByKind, setCustomSvgByKind] = useState<Partial<Record<SymbolKind, string>>>({})
  const [importKind, setImportKind] = useState<SymbolKind>('socket')
  const [templateKey, setTemplateKey] = useState<keyof typeof PROJECT_TEMPLATES>('apartment_basic')
  const calculator = useMemo(() => new ElectricalCalculator(), [])

  const calcResult = useMemo(
    () =>
      calculator.calculateFromPower({
        powerWatts: calcWatts,
        distanceMeters: calcDistance,
        voltage: calcVoltage,
        installationMethod: calcMethod,
        material: calcMaterial,
      }),
    [calculator, calcDistance, calcMaterial, calcMethod, calcVoltage, calcWatts],
  )

  const tools = useMemo(
    () => [
      { id: 'select' as Tool, label: 'Selecionar' },
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
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
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

    canvas.on('mouse:wheel', (opt) => {
      const e = opt.e as WheelEvent
      let zoom = canvas.getZoom()
      zoom *= 0.999 ** e.deltaY
      zoom = Math.min(3, Math.max(0.3, zoom))
      const point = canvas.getScenePoint(e)
      canvas.zoomToPoint(point, zoom)
      setZoomPercent(Math.round(zoom * 100))
      e.preventDefault()
      e.stopPropagation()
    })

    canvas.on('mouse:down', (evt) => {
      const e = evt.e as MouseEvent
      if (e.altKey || e.button === 1) {
        dragging.current = true
        canvas.selection = false
        lastPos.current = { x: e.clientX, y: e.clientY }
        return
      }

      const pointer = canvas.getScenePoint(evt.e)
      if (!pointer) return

      const activeTool = toolRef.current
      if (activeTool === 'wall') {
        if (!wallStart.current) {
          wallStart.current = { x: Math.round(pointer.x / GRID) * GRID, y: Math.round(pointer.y / GRID) * GRID }
          setStatus('Ponto inicial da parede definido.')
          return
        }
        const snapX = Math.round(pointer.x / GRID) * GRID
        const snapY = Math.round(pointer.y / GRID) * GRID
        const wall = new Line([wallStart.current.x, wallStart.current.y, snapX, snapY], {
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

    canvas.on('mouse:move', (evt) => {
      if (!dragging.current) return
      const e = evt.e as MouseEvent
      const vpt = canvas.viewportTransform
      if (!vpt) return
      vpt[4] += e.clientX - lastPos.current.x
      vpt[5] += e.clientY - lastPos.current.y
      canvas.requestRenderAll()
      lastPos.current = { x: e.clientX, y: e.clientY }
    })

    canvas.on('mouse:up', () => {
      dragging.current = false
      canvas.selection = toolRef.current === 'select'
    })

    canvas.on('object:moving', (evt) => {
      const obj = evt.target
      if (!obj || obj.get('evented') === false) return
      obj.set({
        left: Math.round((obj.left ?? 0) / GRID) * GRID,
        top: Math.round((obj.top ?? 0) / GRID) * GRID,
      })
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

  const resetView = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0])
    canvas.setZoom(1)
    setZoomPercent(100)
    canvas.requestRenderAll()
    setStatus('Visualização resetada.')
  }

  const applyTemplate = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const template = PROJECT_TEMPLATES[templateKey]
    clearAll()

    for (const wallData of template.walls) {
      const wall = new Line([wallData.x1, wallData.y1, wallData.x2, wallData.y2], {
        stroke: '#374151',
        strokeWidth: 6,
        selectable: true,
      })
      wall.set('isWall', true)
      canvas.add(wall)
    }

    for (const sym of template.symbols) {
      const svgSource = customSvgByKind[sym.kind] ?? SYMBOL_SVG_LIBRARY[sym.kind]
      const symbol = await createSymbolFromSvg(sym.kind, svgSource, sym.x, sym.y, sym.circuitId)
      canvas.add(symbol)
    }
    setActiveCircuit(template.symbols[0]?.circuitId ?? DEFAULT_CIRCUIT)
    canvas.requestRenderAll()
    setStatus(`Template aplicado: ${template.name}.`)
  }

  const addSymbol = async (kind: SymbolKind) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const center = canvas.getCenterPoint()
    const svgSource = customSvgByKind[kind] ?? SYMBOL_SVG_LIBRARY[kind]
    const symbol = await createSymbolFromSvg(
      kind,
      svgSource,
      Math.round(center.x / GRID) * GRID,
      Math.round(center.y / GRID) * GRID,
      activeCircuit,
    )
    canvas.add(symbol)
    canvas.setActiveObject(symbol)
    setStatus(`${MATERIAL_LABEL[kind]} adicionada no circuito ${activeCircuit}.`)
    canvas.requestRenderAll()
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
    const routeCircuit = String(a.get('circuitId') ?? activeCircuit)
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

    blocked.delete(pointKey(start))
    blocked.delete(pointKey(end))
    const path = runAStar(start, end, blocked, WORKSPACE / GRID + 1, WORKSPACE / GRID + 1)

    if (!path.length) {
      setStatus('Não foi possível encontrar rota sem cruzar paredes.')
      return
    }

    const ductLengthMeters = (path.length - 1) * METER_PER_GRID
    const routeSizing = calculator.calculateFromPower({
      powerWatts: calcWatts,
      distanceMeters: Math.max(1, Number(ductLengthMeters.toFixed(2))),
      voltage: calcVoltage,
      installationMethod: calcMethod,
      material: calcMaterial,
    })

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

    const mid = path[Math.floor(path.length / 2)]
    const sizingLabel = new Text(
      `${routeCircuit}: ${routeSizing.sectionMm2.toFixed(1)} mm2 | DJ ${routeSizing.breakerA} A | ${ductLengthMeters.toFixed(1)} m`,
      {
        left: mid.x * GRID + 8,
        top: mid.y * GRID - 14,
        fontSize: 12,
        fill: '#065f46',
        selectable: false,
        evented: false,
      },
    )
    sizingLabel.set('isDuctLabel', true)
    sizingLabel.set('circuitId', routeCircuit)
    canvas.add(sizingLabel)

    setStatus(
      `Conexão ${routeCircuit} criada com ${path.length - 1} segmentos. Bitola: ${routeSizing.sectionMm2.toFixed(1)} mm2.`,
    )
    canvas.renderAll()
  }

  const exportMaterials = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const counts: Record<string, number> = {}
    const byCircuit: Record<string, { points: number; estimatedPowerW: number }> = {}
    canvas
      .getObjects()
      .filter((o) => o.get('isElectricalPoint'))
      .forEach((o) => {
        const kind = String(o.get('symbolKind'))
        counts[kind] = (counts[kind] ?? 0) + 1
        const circuit = String(o.get('circuitId') ?? DEFAULT_CIRCUIT)
        if (!byCircuit[circuit]) byCircuit[circuit] = { points: 0, estimatedPowerW: 0 }
        byCircuit[circuit].points += 1
        byCircuit[circuit].estimatedPowerW += kind === 'lamp' ? 100 : kind === 'socket' ? 600 : 200
      })

    const ductLengthMeters = canvas
      .getObjects()
      .filter((o) => o.get('isDuct'))
      .reduce((acc, obj) => {
        const duct = obj as Line
        const x1 = Number(duct.x1 ?? 0)
        const y1 = Number(duct.y1 ?? 0)
        const x2 = Number(duct.x2 ?? 0)
        const y2 = Number(duct.y2 ?? 0)
        const px = Math.hypot(x2 - x1, y2 - y1)
        return acc + (px / GRID) * METER_PER_GRID
      }, 0)

    const payload = {
      generatedAt: new Date().toISOString(),
      project: 'WOCA Cursor Clone',
      conduitLengthMeters: Number(ductLengthMeters.toFixed(2)),
      circuits: Object.entries(byCircuit).map(([id, info]) => ({
        id,
        points: info.points,
        estimatedPowerW: info.estimatedPowerW,
      })),
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

  const exportLoadPanel = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const byCircuit: Record<string, { points: number; estimatedPowerW: number }> = {}
    canvas
      .getObjects()
      .filter((o) => o.get('isElectricalPoint'))
      .forEach((o) => {
        const circuit = String(o.get('circuitId') ?? DEFAULT_CIRCUIT)
        const kind = String(o.get('symbolKind'))
        if (!byCircuit[circuit]) byCircuit[circuit] = { points: 0, estimatedPowerW: 0 }
        byCircuit[circuit].points += 1
        byCircuit[circuit].estimatedPowerW += kind === 'lamp' ? 100 : kind === 'socket' ? 600 : 200
      })

    const panel = Object.entries(byCircuit).map(([id, info]) => {
      const sizing = calculator.calculateFromPower({
        powerWatts: info.estimatedPowerW,
        distanceMeters: Math.max(10, info.points * 2),
        voltage: calcVoltage,
        installationMethod: calcMethod,
        material: calcMaterial,
      })
      return {
        circuit: id,
        points: info.points,
        powerWatts: info.estimatedPowerW,
        currentA: Number(sizing.currentA.toFixed(2)),
        sectionMm2: sizing.sectionMm2,
        breakerA: sizing.breakerA,
      }
    })

    const payload = { generatedAt: new Date().toISOString(), panel }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'quadro-cargas.json'
    a.click()
    URL.revokeObjectURL(url)
    setStatus('Quadro de cargas exportado em JSON.')
  }

  const saveProject = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const json = canvas.toObject([
      'isWall',
      'isDuct',
      'isDuctLabel',
      'isElectricalPoint',
      'symbolKind',
      'circuitId',
    ])
    const payload = {
      canvas: json,
      customSvgByKind,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'woca-projeto.json'
    a.click()
    URL.revokeObjectURL(url)
    setStatus('Projeto salvo em JSON.')
  }

  const loadProjectFromFile = async (file: File) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const text = await file.text()
    const parsed = JSON.parse(text)
    const canvasJson = parsed?.canvas ?? parsed
    const importedCustom = (parsed?.customSvgByKind ?? {}) as Partial<Record<SymbolKind, string>>
    await canvas.loadFromJSON(canvasJson)
    setCustomSvgByKind(importedCustom)
    canvas.renderAll()
    setSelectedNodes([])
    setStatus('Projeto carregado com sucesso.')
  }

  const exportPdf = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const image = canvas.toDataURL({ format: 'png', multiplier: 1.4 })
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1400, 900] })
    pdf.text('WOCA Cursor Clone - Planta Elétrica', 24, 28)
    pdf.addImage(image, 'PNG', 20, 40, 1360, 840)
    pdf.save('planta-eletrica.pdf')
    setStatus('PDF exportado com sucesso.')
  }

  const importCustomSymbol = async (file: File, kind: SymbolKind) => {
    const text = await file.text()
    if (!text.includes('<svg')) {
      setStatus('Arquivo inválido: envie um SVG válido.')
      return
    }
    setCustomSvgByKind((prev) => ({ ...prev, [kind]: text }))
    setStatus(`SVG personalizado importado para ${MATERIAL_LABEL[kind]}.`)
  }

  const inferSymbolKindFromName = (name: string): SymbolKind | null => {
    const n = name.toLowerCase()
    if (n.includes('tomada') || n.includes('socket')) return 'socket'
    if (n.includes('interruptor') || n.includes('switch')) return 'switch'
    if (n.includes('lamp') || n.includes('lumin') || n.includes('luz')) return 'lamp'
    return null
  }

  const importBatchSymbols = async (files: FileList) => {
    let imported = 0
    for (const file of Array.from(files)) {
      const kind = inferSymbolKindFromName(file.name)
      if (!kind) continue
      const text = await file.text()
      if (!text.includes('<svg')) continue
      setCustomSvgByKind((prev) => ({ ...prev, [kind]: text }))
      imported += 1
    }
    setStatus(imported > 0 ? `${imported} símbolo(s) importados em lote.` : 'Nenhum SVG válido identificado no lote.')
  }

  const getCircuitSummary = () => {
    const canvas = canvasRef.current
    const byCircuit: Record<string, { points: number; estimatedPowerW: number }> = {}
    if (!canvas) return byCircuit

    canvas
      .getObjects()
      .filter((o) => o.get('isElectricalPoint'))
      .forEach((o) => {
        const circuit = String(o.get('circuitId') ?? DEFAULT_CIRCUIT)
        const kind = String(o.get('symbolKind'))
        if (!byCircuit[circuit]) byCircuit[circuit] = { points: 0, estimatedPowerW: 0 }
        byCircuit[circuit].points += 1
        byCircuit[circuit].estimatedPowerW += kind === 'lamp' ? 100 : kind === 'socket' ? 600 : 200
      })
    return byCircuit
  }

  const exportMemorial = () => {
    const byCircuit = getCircuitSummary()
    const memorial = Object.entries(byCircuit).map(([id, info]) => {
      const sizing = calculator.calculateFromPower({
        powerWatts: info.estimatedPowerW,
        distanceMeters: Math.max(10, info.points * 2),
        voltage: calcVoltage,
        installationMethod: calcMethod,
        material: calcMaterial,
      })
      return {
        circuit: id,
        points: info.points,
        estimatedPowerW: info.estimatedPowerW,
        currentA: Number(sizing.currentA.toFixed(2)),
        sectionMm2: sizing.sectionMm2,
        breakerA: sizing.breakerA,
      }
    })

    const payload = {
      generatedAt: new Date().toISOString(),
      project: 'WOCA Cursor Clone',
      standardReference: 'NBR 5410 (base simplificada)',
      installationMethod: calcMethod,
      voltage: calcVoltage,
      material: calcMaterial,
      circuits: memorial,
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'memorial-descritivo.json'
    a.click()
    URL.revokeObjectURL(url)

    const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
    pdf.setFontSize(14)
    pdf.text('Memorial Descritivo - WOCA Clone', 40, 50)
    pdf.setFontSize(10)
    pdf.text(`Referencia: NBR 5410 (base simplificada)`, 40, 70)
    pdf.text(`Tensao: ${calcVoltage}V | Metodo: ${calcMethod} | Material: ${calcMaterial}`, 40, 85)
    let y = 110
    memorial.forEach((item) => {
      pdf.text(
        `${item.circuit}: ${item.points} pontos | ${item.estimatedPowerW}W | ${item.currentA}A | ${item.sectionMm2}mm2 | DJ ${item.breakerA}A`,
        40,
        y,
      )
      y += 16
    })
    pdf.save('memorial-descritivo.pdf')
    setStatus('Memorial descritivo exportado (JSON e PDF).')
  }

  const onDropSymbol = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const kind = event.dataTransfer.getData('symbol-kind') as SymbolKind
    const canvas = canvasRef.current
    if (!canvas || !kind) return
    const scenePoint = canvas.getScenePoint(event.nativeEvent)
    const svgSource = customSvgByKind[kind] ?? SYMBOL_SVG_LIBRARY[kind]
    const symbol = await createSymbolFromSvg(
      kind,
      svgSource,
      Math.round(scenePoint.x / GRID) * GRID,
      Math.round(scenePoint.y / GRID) * GRID,
      activeCircuit,
    )
    canvas.add(symbol)
    canvas.setActiveObject(symbol)
    canvas.requestRenderAll()
    setStatus(`${MATERIAL_LABEL[kind]} inserida no circuito ${activeCircuit}.`)
  }

  return (
    <div className="flex h-screen w-screen gap-4 p-3 text-slate-100">
      <aside className="w-80 overflow-y-auto rounded-xl bg-slate-900/90 p-4 shadow-xl">
        <h1 className="mb-2 text-lg font-semibold">WOCA Clone (Base)</h1>
        <p className="mb-4 text-xs text-slate-400">Grid 10cm | Fabric.js | A* | Snap | Zoom</p>

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

        <div className="mb-4 rounded-md bg-slate-800 p-3">
          <h2 className="mb-2 text-sm font-semibold">Templates</h2>
          <div className="mb-3 flex gap-2">
            <select
              value={templateKey}
              onChange={(e) => setTemplateKey(e.target.value as keyof typeof PROJECT_TEMPLATES)}
              className="w-full rounded bg-slate-700 px-2 py-1 text-xs"
            >
              {Object.entries(PROJECT_TEMPLATES).map(([key, tpl]) => (
                <option key={key} value={key}>
                  {tpl.name}
                </option>
              ))}
            </select>
            <button onClick={applyTemplate} className="rounded bg-teal-700 px-2 py-1 text-xs">
              Aplicar
            </button>
          </div>
          <h2 className="mb-2 text-sm font-semibold">Paleta de símbolos</h2>
          <label className="mb-2 block text-[11px] text-slate-300">
            Circuito ativo
            <input
              value={activeCircuit}
              onChange={(e) => setActiveCircuit(e.target.value.toUpperCase())}
              className="mt-1 w-full rounded bg-slate-700 px-2 py-1 text-xs"
              placeholder="C1"
            />
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['socket', 'switch', 'lamp'] as SymbolKind[]).map((kind) => (
              <button
                key={kind}
                draggable
                onDragStart={(event) => event.dataTransfer.setData('symbol-kind', kind)}
                onClick={() => addSymbol(kind)}
                className="rounded bg-slate-700 px-2 py-2 text-xs capitalize hover:bg-slate-600"
              >
                {MATERIAL_LABEL[kind].replace(' 2P+T', '')}
              </button>
            ))}
          </div>
          <div className="mt-3 rounded bg-slate-700/60 p-2">
            <div className="mb-1 text-[11px] text-slate-300">Importar SVG personalizado</div>
            <div className="flex gap-2">
              <select
                value={importKind}
                onChange={(e) => setImportKind(e.target.value as SymbolKind)}
                className="w-full rounded bg-slate-700 px-2 py-1 text-xs"
              >
                <option value="socket">Tomada</option>
                <option value="switch">Interruptor</option>
                <option value="lamp">Lâmpada</option>
              </select>
              <button
                onClick={() => symbolImportRef.current?.click()}
                className="rounded bg-sky-700 px-2 py-1 text-xs"
              >
                Importar
              </button>
              <button
                onClick={() => symbolBatchImportRef.current?.click()}
                className="rounded bg-sky-900 px-2 py-1 text-xs"
              >
                Lote
              </button>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Clique para inserir no centro, ou arraste para o canvas.
          </p>
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
          <button onClick={exportLoadPanel} className="w-full rounded-md bg-fuchsia-700 px-3 py-2 text-sm">
            Exportar quadro de cargas
          </button>
          <button onClick={exportMemorial} className="w-full rounded-md bg-emerald-800 px-3 py-2 text-sm">
            Exportar memorial (JSON/PDF)
          </button>
          <button onClick={saveProject} className="w-full rounded-md bg-violet-600 px-3 py-2 text-sm">
            Salvar projeto JSON
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-md bg-cyan-700 px-3 py-2 text-sm"
          >
            Abrir projeto JSON
          </button>
          <button onClick={resetView} className="w-full rounded-md bg-slate-600 px-3 py-2 text-sm">
            Resetar visualização
          </button>
          <button onClick={clearAll} className="w-full rounded-md bg-rose-700 px-3 py-2 text-sm">
            Limpar projeto
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            try {
              await loadProjectFromFile(file)
            } catch {
              setStatus('Falha ao carregar JSON do projeto.')
            } finally {
              e.target.value = ''
            }
          }}
        />
        <input
          ref={symbolImportRef}
          type="file"
          accept=".svg,image/svg+xml"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            try {
              await importCustomSymbol(file, importKind)
            } finally {
              e.target.value = ''
            }
          }}
        />
        <input
          ref={symbolBatchImportRef}
          type="file"
          accept=".svg,image/svg+xml"
          multiple
          className="hidden"
          onChange={async (e) => {
            const files = e.target.files
            if (!files || files.length === 0) return
            try {
              await importBatchSymbols(files)
            } finally {
              e.target.value = ''
            }
          }}
        />

        <div className="mt-4 rounded-md bg-slate-800 p-3 text-xs text-slate-300">
          <div className="mb-2 font-semibold">Calculadora elétrica (NBR 5410 base)</div>
          <div className="mb-2 grid grid-cols-2 gap-2">
            <label className="text-[11px]">
              Carga (W)
              <input
                type="number"
                value={calcWatts}
                onChange={(e) => setCalcWatts(Number(e.target.value))}
                className="mt-1 w-full rounded bg-slate-700 px-2 py-1 text-xs"
              />
            </label>
            <label className="text-[11px]">
              Distância (m)
              <input
                type="number"
                value={calcDistance}
                onChange={(e) => setCalcDistance(Number(e.target.value))}
                className="mt-1 w-full rounded bg-slate-700 px-2 py-1 text-xs"
              />
            </label>
          </div>
          <div className="mb-2 grid grid-cols-2 gap-2">
            <label className="text-[11px]">
              Tensão
              <select
                value={calcVoltage}
                onChange={(e) => setCalcVoltage(Number(e.target.value))}
                className="mt-1 w-full rounded bg-slate-700 px-2 py-1 text-xs"
              >
                <option value={127}>127V</option>
                <option value={220}>220V</option>
              </select>
            </label>
            <label className="text-[11px]">
              Método
              <select
                value={calcMethod}
                onChange={(e) => setCalcMethod(e.target.value as InstallationMethod)}
                className="mt-1 w-full rounded bg-slate-700 px-2 py-1 text-xs"
              >
                <option value="A1">A1</option>
                <option value="A2">A2</option>
                <option value="B1">B1</option>
                <option value="B2">B2</option>
                <option value="C">C</option>
              </select>
            </label>
          </div>
          <label className="text-[11px]">
            Material
            <select
              value={calcMaterial}
              onChange={(e) => setCalcMaterial(e.target.value as MaterialType)}
              className="mt-1 w-full rounded bg-slate-700 px-2 py-1 text-xs"
            >
              <option value="copper">Cobre</option>
              <option value="aluminum">Alumínio</option>
            </select>
          </label>
          <div className="mt-3 rounded bg-slate-700/70 p-2 text-[11px]">
            <div>Corrente estimada: {calcResult.currentA.toFixed(2)} A</div>
            <div>Bitola sugerida: {calcResult.sectionMm2.toFixed(1)} mm²</div>
            <div>Disjuntor sugerido: {calcResult.breakerA} A</div>
            <div>Queda de tensão: {calcResult.voltageDropPercent.toFixed(2)}%</div>
          </div>
        </div>

        <div className="mt-4 rounded-md bg-slate-800 p-3 text-xs text-slate-300">
          <div className="mb-1">
            <strong>Zoom:</strong> {zoomPercent}%
          </div>
          <strong>Status:</strong> {status}
        </div>
      </aside>

      <main className="flex-1 overflow-auto rounded-xl bg-white p-2">
        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDropSymbol}
          className="h-full min-h-[700px] min-w-[1200px]"
        >
          <canvas ref={canvasEl} />
        </div>
      </main>
    </div>
  )
}

export default App
