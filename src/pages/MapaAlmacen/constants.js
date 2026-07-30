export function getOcupColor(pct) {
  if (pct === 0)  return { bg:'bg-[#1a2230]',       border:'border-white/8',       text:'text-[#3d4f60]',  label:'Vacía'    }
  if (pct >= 90)  return { bg:'bg-red-500/10',       border:'border-red-500/30',    text:'text-red-400',    label:'Crítica'  }
  if (pct >= 70)  return { bg:'bg-amber-500/10',     border:'border-amber-500/30',  text:'text-amber-400',  label:'Alta'     }
  if (pct >= 40)  return { bg:'bg-blue-500/10',      border:'border-blue-500/30',   text:'text-blue-400',   label:'Media'    }
  return            { bg:'bg-[#00c896]/8',       border:'border-[#00c896]/20',  text:'text-[#00c896]', label:'Baja'     }
}

/** Convierte codigo "A01-02" → { zona:'A', fila:1, col:2 } para la grilla visual */
export function parseCodigo(codigo) {
  const m = codigo.match(/^([A-Z]+)(\d+)-(\d+)$/)
  if (!m) return { zona: codigo[0] || 'X', fila: 0, col: 0 }
  return { zona: m[1], fila: parseInt(m[2], 10), col: parseInt(m[3], 10) }
}
