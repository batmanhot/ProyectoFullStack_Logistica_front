import { Clock, Navigation as NavIcon, CheckCircle, X } from 'lucide-react'

export const ESTADO_RUTA = {
  PROGRAMADA: { label:'Programada',  color:'neutral', icon:Clock        },
  EN_RUTA:    { label:'En Ruta',     color:'info',    icon:NavIcon      },
  COMPLETADA: { label:'Completada',  color:'success', icon:CheckCircle  },
  CANCELADA:  { label:'Cancelada',   color:'danger',  icon:X            },
}

export const ESTADO_PARADA = {
  PENDIENTE: { label:'Pendiente',    color:'neutral' },
  EN_CAMINO: { label:'En camino',    color:'info'    },
  ENTREGADO: { label:'Entregado',    color:'success' },
  FALLIDO:   { label:'No entregado', color:'danger'  },
}
