/**
 * BarcodeScanner.jsx
 * Lector de código de barras usando BarcodeDetector API nativa del navegador.
 * Sin dependencias externas. Funciona en Chrome/Edge con cámara del celular o PC.
 * Fallback: input manual si BarcodeDetector no está disponible.
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { Camera, CameraOff, X, Scan, AlertTriangle, CheckCircle } from 'lucide-react'

export default function BarcodeScanner({ onDetected, onClose, label = 'Escanear código' }) {
  const videoRef   = useRef(null)
  const canvasRef  = useRef(null)
  const streamRef  = useRef(null)
  const timerRef   = useRef(null)
  const detRef     = useRef(null)

  const [estado,    setEstado]    = useState('idle')   // idle | iniciando | escaneando | ok | error | manual
  const [mensaje,   setMensaje]   = useState('')
  const [manual,    setManual]    = useState('')
  const [soportado, setSoportado] = useState(null)     // null=verificando, true/false

  // Verificar soporte al montar
  useEffect(() => {
    const ok = 'BarcodeDetector' in window
    setSoportado(ok)
    if (!ok) setEstado('manual')
    return () => detenerCamara()
  }, [])

  async function iniciarCamara() {
    setEstado('iniciando')
    setMensaje('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      // Crear detector
      detRef.current = new window.BarcodeDetector({
        formats: ['ean_13','ean_8','qr_code','code_128','code_39','upc_a','upc_e','data_matrix','aztec','pdf417']
      })
      setEstado('escaneando')
      escanear()
    } catch (e) {
      setEstado('error')
      setMensaje(e.name === 'NotAllowedError'
        ? 'Permiso de cámara denegado. Habilita la cámara en la configuración del navegador.'
        : 'No se pudo acceder a la cámara. Usa el modo manual.')
    }
  }

  function detenerCamara() {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  const escanear = useCallback(async () => {
    if (!videoRef.current || !detRef.current || !canvasRef.current) return
    if (videoRef.current.readyState < 2) {
      timerRef.current = setTimeout(escanear, 100)
      return
    }
    try {
      const codes = await detRef.current.detect(videoRef.current)
      if (codes.length > 0) {
        const codigo = codes[0].rawValue
        setEstado('ok')
        setMensaje(`✓ Código detectado: ${codigo}`)
        detenerCamara()
        setTimeout(() => {
          onDetected(codigo)
        }, 600)
        return
      }
    } catch (e) { /* Continuar escaneando */ }
    timerRef.current = setTimeout(escanear, 200)
  }, [onDetected])

  function handleManual(e) {
    e.preventDefault()
    if (manual.trim()) {
      onDetected(manual.trim())
      setManual('')
    }
  }

  const SI = 'w-full px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 font-mono placeholder-[#5f6f80]'

  return (
    <div className="flex flex-col gap-4">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scan size={16} className="text-[#00c896]"/>
          <span className="text-[13px] font-semibold text-[#e8edf2]">{label}</span>
        </div>
        {onClose && (
          <button onClick={() => { detenerCamara(); onClose() }}
            className="text-[#5f6f80] hover:text-[#e8edf2] transition-colors p-1 rounded-lg hover:bg-white/[0.05]">
            <X size={14}/>
          </button>
        )}
      </div>

      {/* Soporte */}
      {soportado === false && (
        <div className="flex items-start gap-2.5 px-3 py-2.5 bg-amber-500/10 border border-amber-500/25 rounded-lg text-[12px] text-amber-300">
          <AlertTriangle size={13} className="shrink-0 mt-0.5"/>
          <span>Tu navegador no soporta BarcodeDetector API. Usa Chrome o Edge para escanear con la cámara. Ingresa el código manualmente.</span>
        </div>
      )}

      {/* Vista de cámara */}
      {soportado && estado !== 'manual' && (
        <div className="relative rounded-xl overflow-hidden bg-[#0e1117]" style={{ minHeight: 220 }}>
          <video ref={videoRef} className="w-full rounded-xl" style={{ maxHeight: 280, objectFit: 'cover' }} muted playsInline/>
          <canvas ref={canvasRef} className="hidden"/>

          {/* Overlay de guía */}
          {estado === 'escaneando' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-2 border-[#00c896] rounded-lg w-48 h-24 opacity-70"
                style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)' }}>
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00c896] rounded-tl-lg"/>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00c896] rounded-tr-lg"/>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#00c896] rounded-bl-lg"/>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00c896] rounded-br-lg"/>
                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-[#00c896] animate-pulse opacity-80"/>
              </div>
            </div>
          )}

          {/* Estados overlay */}
          {(estado === 'idle' || estado === 'error') && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0e1117]/90">
              <CameraOff size={32} className="text-[#5f6f80]"/>
              {mensaje && <p className="text-[12px] text-[#9ba8b6] text-center px-4 max-w-[280px]">{mensaje}</p>}
            </div>
          )}
          {estado === 'ok' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#00c896]/20">
              <CheckCircle size={36} className="text-[#00c896]"/>
              <p className="text-[12px] text-[#00c896] font-semibold">{mensaje}</p>
            </div>
          )}
          {estado === 'iniciando' && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0e1117]/80">
              <div className="w-6 h-6 rounded-full border-2 border-[#00c896]/30 border-t-[#00c896] animate-spin"/>
            </div>
          )}
        </div>
      )}

      {/* Botones de cámara */}
      {soportado && (
        <div className="flex gap-2">
          {(estado === 'idle' || estado === 'error') && (
            <button onClick={iniciarCamara}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#00c896]/15 text-[#00c896] border border-[#00c896]/30 rounded-lg text-[13px] font-semibold hover:bg-[#00c896]/25 transition-colors">
              <Camera size={15}/> Activar cámara
            </button>
          )}
          {estado === 'escaneando' && (
            <button onClick={() => { detenerCamara(); setEstado('idle') }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500/15 text-red-400 border border-red-500/30 rounded-lg text-[13px] font-semibold hover:bg-red-500/25 transition-colors">
              <CameraOff size={15}/> Detener
            </button>
          )}
          <button onClick={() => { detenerCamara(); setEstado('manual') }}
            className="px-3 py-2.5 border border-white/[0.08] rounded-lg text-[12px] text-[#5f6f80] hover:text-[#9ba8b6] hover:border-white/[0.16] transition-colors">
            Manual
          </button>
        </div>
      )}

      {/* Input manual */}
      <div>
        <div className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-[0.08em] mb-1.5">
          {soportado ? 'O ingresa el código manualmente' : 'Código de barras / SKU'}
        </div>
        <form onSubmit={handleManual} className="flex gap-2">
          <input
            type="text"
            className={SI + ' flex-1'}
            value={manual}
            onChange={e => setManual(e.target.value)}
            placeholder="Escanea con lector USB o escribe el código..."
            autoFocus={!soportado}
            onKeyDown={e => e.key === 'Enter' && handleManual(e)}
          />
          <button type="submit" disabled={!manual.trim()}
            className="px-4 py-2 bg-[#00c896] text-[#082e1e] text-[13px] font-semibold rounded-lg disabled:opacity-40 hover:bg-[#00e0aa] transition-colors shrink-0">
            OK
          </button>
        </form>
        <p className="text-[10px] text-[#5f6f80] mt-1.5">
          Compatible con lectores USB — escanea directamente en el campo y presiona Enter
        </p>
      </div>
    </div>
  )
}
