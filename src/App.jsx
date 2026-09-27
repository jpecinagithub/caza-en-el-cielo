import { useState, useRef, useCallback } from 'react'
import GameCanvas from './components/GameCanvas.jsx'
import HUD from './components/HUD.jsx'
import MainMenu from './components/MainMenu.jsx'
import Settings from './components/Settings.jsx'
import HunterName from './components/HunterName.jsx'
import GameOver, { RecordsView } from './components/GameOver.jsx'
import {
  loadSettings, saveSettings,
  loadRecords, saveRecords, insertRanking,
  loadHunter, saveHunter,
} from './game/config.js'

export default function App() {
  const [screen, setScreen] = useState('menu') // menu | game
  const [settings, setSettings] = useState(loadSettings)
  const [records, setRecords] = useState(loadRecords)
  const [hud, setHud] = useState(null)
  const [paused, setPaused] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [recordsOpen, setRecordsOpen] = useState(false)
  const [namePrompt, setNamePrompt] = useState(false)
  const [hunter, setHunter] = useState(loadHunter)
  const [gameOver, setGameOver] = useState(null) // { stats, rank }
  const engineRef = useRef(null)
  const recordsRef = useRef(records)
  recordsRef.current = records
  const hunterRef = useRef(hunter)
  hunterRef.current = hunter

  // Persistir ajustes (se aplican en vivo vía GameCanvas -> engine.applySettings)
  const updateSettings = useCallback((next) => {
    setSettings(next)
    saveSettings(next)
  }, [])

  const handleHUD = useCallback((h) => setHud(h), [])

  const handleGameOver = useCallback((stats) => {
    const prev = recordsRef.current
    const entry = {
      name: hunterRef.current || 'Cazador',
      score: stats.score,
      date: new Date().toISOString(),
    }
    const { ranking, rank } = insertRanking(prev.ranking, entry)
    const next = { ranking, games: prev.games + 1 }
    saveRecords(next)
    setRecords(next)
    setGameOver({ stats: { ...stats, hunterName: entry.name }, rank })
    setPaused(false)
  }, [])

  const startGame = useCallback(() => {
    setGameOver(null)
    setPaused(false)
    setHud(null)
    setScreen('game')
  }, [])

  // "Jugar" siempre pide el nombre del cazador primero
  const askHunterAndPlay = useCallback(() => setNamePrompt(true), [])

  const confirmHunter = useCallback((name) => {
    saveHunter(name)
    setHunter(name)
    setNamePrompt(false)
    startGame()
  }, [startGame])

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

  // Reintentar desde el panel de fin de partida: mismo cazador, sin preguntar
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
            ranking={records.ranking}
            onPlay={askHunterAndPlay}
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
              ranking={records.ranking}
              rank={gameOver.rank}
              onRetry={retryFromOver}
              onMenu={quitToMenu}
            />
          )}
        </>
      )}

      {namePrompt && (
        <HunterName
          initialName={hunter}
          onConfirm={confirmHunter}
          onCancel={() => setNamePrompt(false)}
        />
      )}
      {settingsOpen && (
        <Settings
          settings={settings}
          onChange={updateSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {recordsOpen && (
        <RecordsView
          ranking={records.ranking}
          games={records.games}
          onClose={() => setRecordsOpen(false)}
        />
      )}
    </div>
  )
}
