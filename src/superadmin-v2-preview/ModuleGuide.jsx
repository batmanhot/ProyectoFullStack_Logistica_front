const GUIDES = {
  dashboard: [
    ['1. Revisar indicadores', 'Empieza por clientes activos, ingresos estimados, uso y alertas que necesitan atención.'],
    ['2. Priorizar riesgos', 'Atiende primero vencimientos, capacidad agotada y accesos administrativos pendientes.'],
    ['3. Usar acciones rápidas', 'Crea negocios o planes y navega hacia la operación que necesitas resolver.'],
    ['4. Confirmar en el módulo', 'Los indicadores resumen información; los cambios se realizan en la pantalla especializada.'],
  ],
  negocios: [
    ['1. Registrar el negocio', 'Define razón social, plan, renovación, próximo cobro y capacidad inicial.'],
    ['2. Revisar detalle 360°', 'Comprueba administradores, consumo, actividad y salud antes de intervenir.'],
    ['3. Gestionar el ciclo', 'Trial, activo, gracia, suspensión, cancelación y archivo son estados auditables.'],
    ['4. Archivar, no eliminar', 'Conserva historial y trazabilidad; la eliminación permanente queda fuera del flujo normal.'],
  ],
  usuarios: [
    ['1. Crear el responsable', 'Todo tenant debe conservar al menos un Admin Owner activo y verificable.'],
    ['2. Delegar administración', 'Admin Tenant gestiona la operación permitida sin sustituir al propietario.'],
    ['3. Respetar el plan', 'Altas y roles deben quedar dentro de los límites y módulos contratados.'],
    ['4. Auditar cambios', 'Registra altas, cambios de rol, bloqueos, recuperación y revocación de sesiones.'],
  ],
  soporte: [
    ['1. Registrar el caso', 'Identifica tenant, solicitante, motivo, prioridad y evidencia disponible.'],
    ['2. Verificar identidad', 'Nunca recuperes accesos o datos únicamente por una llamada o mensaje.'],
    ['3. Aprobar intervención', 'Define alcance y duración antes de habilitar cualquier modo soporte.'],
    ['4. Cerrar con auditoría', 'Documenta inicio, fin, acciones ejecutadas y resultado comunicado al cliente.'],
  ],
  planes: [
    ['1. Elegir el segmento', 'Usa una plantilla vinculada al plan o configura un plan personalizado privado.'],
    ['2. Definir capacidad', 'Establece usuarios, productos, almacenes, terceros, órdenes y almacenamiento.'],
    ['3. Seleccionar módulos', 'Las dependencias se validan para evitar ofertas funcionalmente incoherentes.'],
    ['4. Revisar el impacto', 'Antes de guardar comprueba clientes afectados, módulos retirados y límites reducidos.'],
  ],
  salud: [
    ['1. Revisar servicios', 'Comprueba disponibilidad, sincronización, notificaciones y componentes críticos.'],
    ['2. Validar respaldos', 'Un backup cuenta como saludable solo si fue completado y verificado.'],
    ['3. Correlacionar alertas', 'Relaciona degradaciones técnicas con tenants, límites y eventos recientes.'],
    ['4. Ejecutar el runbook', 'Escala cada incidente según severidad, responsable y procedimiento de continuidad.'],
  ],
  alertas: [
    ['1. Identificar la fuente', 'Cada alerta debe indicar categoría, tenant, origen y momento de detección.'],
    ['2. Evaluar severidad', 'Prioriza seguridad y continuidad antes que avisos comerciales o informativos.'],
    ['3. Asignar responsable', 'Define quién investiga, tiempo objetivo y canal de escalamiento.'],
    ['4. Resolver y documentar', 'Cerrar una alerta requiere resultado, evidencia y evento de auditoría.'],
  ],
  auditoria: [
    ['1. Buscar por contexto', 'Filtra por actor, tenant, recurso, tipo, resultado y periodo.'],
    ['2. Seguir correlaciones', 'Usa request_id y correlation_id para reconstruir operaciones relacionadas.'],
    ['3. Preservar evidencia', 'Los eventos de auditoría no deben editarse ni eliminarse desde la aplicación.'],
    ['4. Exportar con control', 'Toda extracción debe registrar solicitante, motivo, alcance y fecha.'],
  ],
  administradores: [
    ['1. Aplicar mínimo privilegio', 'Concede administración de plataforma solo a responsables autorizados.'],
    ['2. Exigir MFA', 'Las cuentas privilegiadas deben usar segundo factor antes de operar en producción.'],
    ['3. Revisar sesiones', 'Controla dispositivo, antigüedad y revocación ante actividad sospechosa.'],
    ['4. Recertificar accesos', 'Revisa periódicamente cuentas inactivas, permisos y responsables vigentes.'],
  ],
  configuracion: [
    ['1. Completar los gates', 'No integres motores externos mientras falten contratos, aislamiento u observabilidad.'],
    ['2. Usar adaptadores', 'Centraliza ACE y Approval Engine para evitar llamadas dispersas.'],
    ['3. Validar en sombra', 'Compara decisiones sin bloquear la operación durante la etapa inicial.'],
    ['4. Desplegar por cohortes', 'Usa flags auditables, métricas y rollback antes del despliegue general.'],
  ],
  landing: [
    ['1. Editar el contenido', 'Configura marca, Hero, características, contacto, SEO y footer.'],
    ['2. Revisar enlaces', 'Verifica CTA, imágenes, logo, redes y datos públicos antes de guardar.'],
    ['3. Guardar configuración', 'El contenido publicado usa el mismo contrato que la Landing Page pública.'],
    ['4. Abrir vista pública', 'Comprueba escritorio y móvil antes de considerar terminado el cambio.'],
  ],
  analytics: [
    ['1. Definir el embudo', 'Alinea visitas, solicitudes, trials y clientes con eventos medibles.'],
    ['2. Validar la fuente', 'Documenta proveedor, periodo, zona horaria y reglas de atribución.'],
    ['3. Proteger privacidad', 'Configura consentimiento y retención antes de activar seguimiento.'],
    ['4. Tomar decisiones', 'Compara conversión por canal, segmento y plan sin confundir correlación con causa.'],
  ],
}

export default function ModuleGuide({ route }) {
  const items = GUIDES[route] || GUIDES.dashboard
  return <details className="mt-6 rounded-xl border border-white/8 bg-[#111620] p-4" aria-labelledby={`guide-${route}`}>
    <summary className="cursor-pointer list-none text-sm font-medium text-[#9ba8b6]">Guía de esta sección</summary>
    <p id={`guide-${route}`} className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#5f6f80]">¿Cómo funciona este módulo?</p>
    <div className="mt-3 grid gap-3 md:grid-cols-2 2xl:grid-cols-4">{items.map(([title, description]) => <article key={title} className="rounded-lg border-l-2 border-[#00c896]/50 bg-white/2 p-3"><h2 className="text-xs font-semibold text-[#e8edf2]">{title}</h2><p className="mt-1 text-[11px] leading-relaxed text-[#5f6f80]">{description}</p></article>)}</div>
  </details>
}
