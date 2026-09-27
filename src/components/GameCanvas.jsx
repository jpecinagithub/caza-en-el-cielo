import { useEffect, useRef } from 'react'
import { createEngine } from '../game/engine.js'

// GameCanvas: lienzo + bucle del motor, desacoplado del render de React.
// Props:
//   settings      — ajustes actuales (se aplican en vivo)
//   mode          — 'attract' (fondo del menú) | 'game' (partida)
//   onHUD(hud)    — estado del HUD (throttled por el motor)
//   onGameOver(s) — estadísticas finales
//   onPause()     — el usuario pidió pausar (botón HUD o tecla Esc)
//   engineRef     — ref compartido para controlar el motor desde App
export default function GameCanvas({ settings, mode, onHUD, onGameOver, onPause, engineRef }) {
  const canvasRef = useRef(null)
  const settingsRef = useRef(settings)
  const onHUDRef = useRef(onHUD)
  const onGameOverRef = useRef(onGameOver)
  const onPauseRef = useRef(onPause)

  settingsRef.current = settings
  onHUDRef.current = onHUD
  onGameOverRef.current = onGameOver
  onPauseRef.current = onPause

  // Crear el motor una sola vez por montaje; limpieza total al desmontar
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const engine = createEngine(canvas, {
      getSettings: () => settingsRef.current,
      onHUD: (hud) => onHUDRef.current(hud),
      onGameOver: (stats) => onGameOverRef.current(stats),
    })
    engineRef.current = engine
    // hook de depuración para tests (solo estado de la partida)
    window.__caza = engine
    engine.start()
    if (mode === 'game') engine.newGame()
    else engine.toAttract()

    const toCanvas = (clientX, clientY) => {
      const r = canvas.getBoundingClientRect()
      return { x: clientX - r.left, y: clientY - r.top }
    }

    const onClick = (e) => {
      const { x, y } = toCanvas(e.clientX, e.clientY)
      engine.click(x, y)
    }
    const onMouseMove = (e) => {
      const { x, y } = toCanvas(e.clientX, e.clientY)
      engine.setMouse(x, y, true)
    }
    const onMouseLeave = () => engine.setMouse(0, 0, false)
    const onKey = (e) => {
      if (e.key === 'Escape' && mode === 'game') {
        const m = engine.getMode()
        if (m === 'playing' || m === 'countdown') onPauseRef.current()
      }
    }

    canvas.addEventListener('click', onClick)
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseleave', onMouseLeave)
    window.addEventListener('keydown', onKey)

    return () => {
      canvas.removeEventListener('click', onClick)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseleave', onMouseLeave)
      window.removeEventListener('keydown', onKey)
      engine.destroy()
      engineRef.current = null
      if (window.__caza === engine) delete window.__caza
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Aplicar ajustes en vivo sin recargar
  useEffect(() => {
    const engine = engineRef.current
    if (engine) engine.applySettings()
  }, [settings, engineRef])

  return (
    <div className="game-wrap">
      <canvas ref={canvasRef} className="game-canvas" />
    </div>
  )
}
