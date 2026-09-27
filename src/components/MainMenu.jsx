import React from 'react'

// Menú principal sobre el fondo animado en vivo (modo attract del motor)
export default function MainMenu({ ranking, onPlay, onSettings, onRecords }) {
  const top = ranking.slice(0, 5)
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

        {top.length > 0 && (
          <div className="menu-ranking">
            <div className="ranking-title">🏆 Mejores cazadores</div>
            <ol className="ranking-list">
              {top.map((r, i) => (
                <li key={`${r.date}-${i}`} className={i === 0 ? 'first' : ''}>
                  <span className="rk-pos">{i + 1}</span>
                  <span className="rk-name">{r.name}</span>
                  <span className="rk-score">{r.score.toLocaleString('es')}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="menu-hint">Clic para disparar · Esc para pausar</div>
      </div>
    </div>
  )
}
