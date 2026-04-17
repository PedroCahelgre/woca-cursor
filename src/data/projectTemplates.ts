import type { SymbolKind } from '../types/symbols'

export type TemplateSymbol = {
  kind: SymbolKind
  x: number
  y: number
  circuitId: string
}

export type TemplateWall = {
  x1: number
  y1: number
  x2: number
  y2: number
}

export type ProjectTemplate = {
  name: string
  walls: TemplateWall[]
  symbols: TemplateSymbol[]
}

export const PROJECT_TEMPLATES: Record<string, ProjectTemplate> = {
  apartment_basic: {
    name: 'Apartamento básico',
    walls: [
      { x1: 120, y1: 120, x2: 920, y2: 120 },
      { x1: 920, y1: 120, x2: 920, y2: 620 },
      { x1: 920, y1: 620, x2: 120, y2: 620 },
      { x1: 120, y1: 620, x2: 120, y2: 120 },
      { x1: 520, y1: 120, x2: 520, y2: 620 },
    ],
    symbols: [
      { kind: 'lamp', x: 300, y: 260, circuitId: 'C1' },
      { kind: 'lamp', x: 720, y: 260, circuitId: 'C1' },
      { kind: 'socket', x: 220, y: 520, circuitId: 'C2' },
      { kind: 'socket', x: 820, y: 520, circuitId: 'C2' },
      { kind: 'switch', x: 490, y: 280, circuitId: 'C3' },
    ],
  },
  commercial_room: {
    name: 'Sala comercial',
    walls: [
      { x1: 160, y1: 160, x2: 1080, y2: 160 },
      { x1: 1080, y1: 160, x2: 1080, y2: 700 },
      { x1: 1080, y1: 700, x2: 160, y2: 700 },
      { x1: 160, y1: 700, x2: 160, y2: 160 },
    ],
    symbols: [
      { kind: 'lamp', x: 380, y: 320, circuitId: 'C1' },
      { kind: 'lamp', x: 620, y: 320, circuitId: 'C1' },
      { kind: 'lamp', x: 860, y: 320, circuitId: 'C1' },
      { kind: 'socket', x: 260, y: 620, circuitId: 'C2' },
      { kind: 'socket', x: 980, y: 620, circuitId: 'C2' },
      { kind: 'switch', x: 200, y: 300, circuitId: 'C3' },
    ],
  },
}

