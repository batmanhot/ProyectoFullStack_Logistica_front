// ── Constantes de estado ────────────────────────────────────
export const ESTADOS = {
  BORRADOR:  { label:'Borrador',   color:'#64748b', bg:'#64748b15' },
  ENVIADO:   { label:'Enviado',    color:'#3b82f6', bg:'#3b82f615' },
  APROBADO:  { label:'Aprobado',   color:'#00c896', bg:'#00c89615' },
  PICKING:   { label:'Picking',    color:'#f59e0b', bg:'#f59e0b15' },
  ENTREGADO: { label:'Entregado',  color:'#10b981', bg:'#10b98115' },
  RECHAZADO: { label:'Rechazado',  color:'#ef4444', bg:'#ef444415' },
}
export const PRIORIDADES = {
  NORMAL:  { label:'Normal',  color:'#64748b' },
  URGENTE: { label:'Urgente', color:'#f59e0b' },
  CRITICO: { label:'Crítico', color:'#ef4444' },
}
export const ESTADOS_LISTA = ['BORRADOR','ENVIADO','APROBADO','PICKING','ENTREGADO','RECHAZADO']
export const SI  = 'w-full px-3 py-2 bg-[#1e2835] border border-white/8 rounded-lg text-[13px] text-[#e8edf2] placeholder-[#5f6f80] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 font-[inherit]'
export const SEL = SI + ' pr-8'
export const DS  = { colorScheme: 'dark' }
