import React from 'react'

// Menú principal sobre el fondo animado en vivo (modo attract del motor)
export default function MainMenu({ records, onPlay, onSettings, onRecords }) {
  return (
    <div className="menu-overlay">
      <div className="menu-card">
        <div className="menu-kicker">ARCADE · 90 SEGUNDOS</div>
        <h1 className="menu-title">
          <span className="t1">CAZA</span>
          <span className="t2">en el</span>
          <span className="t3">CIELO</span>
        </h1>
        <p className="menu-sub">
          Afina la puntería: solo tu ratón, un cielo lleno de aves
          y un "entorno razonable" que tú configuras.
        </p>
        <div className="menu-buttons">
          <button className="btn btn-primary" onClick={onPlay}>
            ▶&nbsp; Jugar
          </button>
          <button className="btn" onClick={onSettings}>
            ⚙&nbsp; Ajustes
          </button>
          <button className="btn" onClick={onRecords}>
            🏆&nbsp; Récords
          </button>
        </div>
        {records.best > 0 && (
          <div className="menu-best">
            Mejor marca: <strong>{records.best.toLocaleString('es')} pts</strong>
          </div>
        )}
        <div className="menu-hint">Clic para disparar · Esc para pausar</div>
      </div>
    </div>
  )
}
