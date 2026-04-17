import type { SymbolKind } from '../types/symbols'

export const SYMBOL_SVG_LIBRARY: Record<SymbolKind, string> = {
  socket: `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <circle cx="32" cy="32" r="24" fill="#dbeafe" stroke="#1d4ed8" stroke-width="4"/>
  <circle cx="24" cy="30" r="3.5" fill="#1d4ed8"/>
  <circle cx="40" cy="30" r="3.5" fill="#1d4ed8"/>
  <rect x="30" y="37" width="4" height="7" fill="#1d4ed8"/>
</svg>`,
  switch: `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect x="10" y="14" width="44" height="36" rx="4" fill="#eef2ff" stroke="#3730a3" stroke-width="4"/>
  <line x1="22" y1="42" x2="42" y2="22" stroke="#3730a3" stroke-width="5"/>
</svg>`,
  lamp: `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <circle cx="32" cy="28" r="16" fill="#fef3c7" stroke="#b45309" stroke-width="4"/>
  <path d="M24 46h16l-3 8h-10z" fill="#b45309"/>
  <line x1="32" y1="4" x2="32" y2="12" stroke="#b45309" stroke-width="3"/>
</svg>`,
}

