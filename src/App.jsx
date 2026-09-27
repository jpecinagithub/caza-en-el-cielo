import { useState, useRef, useCallback } from 'react'
import GameCanvas from './components/GameCanvas.jsx'
import HUD from './components/HUD.jsx'
import MainMenu from './components/MainMenu.jsx'
import Settings from './components/Settings.jsx'
import GameOver, { RecordsView } from './components/GameOver.jsx'
import { loadSettings, saveSettings, loadRecords, saveRecords } from './game/config.js'

export default function App() {
  const [screen, setScreen] = useState('menu') // menu | game
  const [settings, setSettings] = useState(loadSettings)
  const [records, setRecords] = useState(loadRecords)
  const [hud, setHud] = useState(null)
  const [paused, setPaused] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [recordsOpen, setRecordsOpen] = useState(false)
  const [gameOver, setGameOver] = useState(null) // { stats, isNewRecord }
  const engineRef = useRef(null)
  const recordsRef = useRef(records)
  recordsRef.current = records

  // Persistir ajustes (se aplican en vivo vía GameCanvas -> engine.applySettings)
  const updateSettings = useCallback((next) => {
    setSettings(next)
    saveSettings(next)
  }, [])

  const handleHUD = useCallback((h) => setHud(h), [])

  const handleGameOver = useCallback((stats) => {
    const prev = recordsRef.current
    const isNew = stats.score > prev.best && stats.score > 0
    const next = {
      best: Math.max(prev.best, stats.score),
      bestDate: isNew ? new Date().toISOString() : prev.bestDate,
      games: prev.games + 1,
    }
    saveRecords(next)
    setRecords(next)
    setGameOver({ stats, isNewRecord: isNew })
    setPaused(false)
  }, [])

  const startGame = useCallback(() => {
    setGameOver(null)
    setPaused(false)
    setHud(null)
    setScreen('game')
  }, [])

  const pauseGame = useCallback(() => {
    const engine = engineRef.current
    if (engine && (engine.getMode() === 'playing' || engine.getMode() === 'countdown')) {
      engine.pause()
      setPaused(true)
    }
  }, [])

  const resumeGame = useCallback(() => {
    engineRef.current?.resume()
    setPaused(false)
  }, [])

  const restartGame = useCallback(() => {
    setGameOver(null)
    setPaused(false)
    engineRef.current?.newGame()
  }, [])

  const quitToMenu = useCallback(() => {
    setPaused(false)
    setGameOver(null)
    setHud(null)
    setScreen('menu')
  }, [])

  // Reintentar desde el panel de fin de partida: reutiliza el mismo motor
  const retryFromOver = useCallback(() => {
    setGameOver(null)
    engineRef.current?.newGame()
  }, [])

  return (
    <div className="app">
      {screen === 'menu' && (
        <>
          <GameCanvas
            key="attract"
            mode="attract"
            settings={settings}
            onHUD={() => {}}
            onGameOver={() => {}}
            onPause={() => {}}
            engineRef={engineRef}
          />
          <MainMenu
            records={records}
            onPlay={startGame}
            onSettings={() => setSettingsOpen(true)}
            onRecords={() => setRecordsOpen(true)}
          />
        </>
      )}

      {screen === 'game' && (
        <>
          <GameCanvas
            key="game"
            mode="game"
            settings={settings}
            onHUD={handleHUD}
            onGameOver={handleGameOver}
            onPause={pauseGame}
            engineRef={engineRef}
          />
          <HUD hud={hud} onPause={pauseGame} />

          {paused && !gameOver && (
            <div className="modal-backdrop">
              <div className="modal">
                <h2>⏸ Pausa</h2>
                <div className="menu-buttons col">
                  <button className="btn btn-primary btn-block" onClick={resumeGame}>
                    ▶&nbsp; Reanudar
                  </button>
                  <button className="btn btn-block" onClick={restartGame}>
                    ↻&nbsp; Reiniciar
                  </button>
                  <button className="btn btn-block" onClick={() => setSettingsOpen(true)}>
                    ⚙&nbsp; Ajustes
                  </button>
                  <button className="btn btn-block" onClick={quitToMenu}>
                    ☰&nbsp; Salir al menú
                  </button>
                </div>
              </div>
            </div>
          )}

          {gameOver && (
            <GameOver
              stats={gameOver.stats}
              records={records}
              isNewRecord={gameOver.isNewRecord}
              onRetry={retryFromOver}
              onMenu={quitToMenu}
            />
          )}
        </>
      )}

      {settingsOpen && (
        <Settings
          settings={settings}
          onChange={updateSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {recordsOpen && (
        <RecordsView records={records} onClose={() => setRecordsOpen(false)} />
      )}
    </div>
  )
}
