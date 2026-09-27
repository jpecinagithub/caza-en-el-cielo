import React from 'react'

// HUD: puntos, cronómetro, combo, derribadas/objetivo, oleada y botón de pausa
export default function HUD({ hud, onPause }) {
  if (!hud) return null
  const mm = Math.floor(hud.timeLeft / 60)
  const ss = String(hud.timeLeft % 60).padStart(2, '0')
  const urgent = hud.timeLeft <= 10
  const acc = Math.round(hud.accuracy * 100)

  return (
    <div className="hud">
      <div className="hud-left">
        <div className="hud-score">
          <span className="hud-label">Puntos</span>
          <span className="hud-value score">{hud.score.toLocaleString('es')}</span>
        </div>
        <div className="hud-chip" title="Aves derribadas / objetivo">
          🐦 {hud.birdsDown}/{hud.objective}
        </div>
        <div className="hud-chip" title="Precisión">
          🎯 {acc}%
        </div>
      </div>

      <div className="hud-center">
        <div className={`hud-timer ${urgent ? 'urgent' : ''}`}>
          {mm}:{ss}
        </div>
        <div className="hud-wave">{hud.wave}</div>
      </div>

      <div className="hud-right">
        {hud.combo > 1 && (
          <div className="hud-combo" key={hud.combo}>
            🔥 x{hud.combo}
            <span className="hud-streak">{hud.streak} seguidos</span>
          </div>
        )}
        <button className="hud-btn" onClick={onPause} title="Pausa (Esc)" aria-label="Pausa">
          ⏸
        </button>
      </div>
    </div>
  )
}
