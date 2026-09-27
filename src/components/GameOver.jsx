import React from 'react'

// RecordsView: mejor marca persistente
export function RecordsView({ records, onClose }) {
  const date = records.bestDate ? new Date(records.bestDate).toLocaleDateString('es') : null
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>🏆 Récords</h2>
        {records.best > 0 ? (
          <div className="records-body">
            <div className="record-best">{records.best.toLocaleString('es')} <span>pts</span></div>
            {date && <div className="record-date">conseguido el {date}</div>}
            <div className="record-games">{records.games} {records.games === 1 ? 'partida jugada' : 'partidas jugadas'}</div>
          </div>
        ) : (
          <p className="records-empty">Aún no hay marcas. ¡Sal a cazar y vuelve con un récord!</p>
        )}
        <button className="btn btn-primary btn-block" onClick={onClose}>Cerrar</button>
      </div>
    </div>
  )
}

// Fin de partida: puntuación, récord, estadísticas y reintentar
export default function GameOver({ stats, records, isNewRecord, onRetry, onMenu }) {
  const acc = Math.round(stats.accuracy * 100)
  return (
    <div className="modal-backdrop">
      <div className="modal gameover">
        <div className="menu-kicker">FIN DE LA PARTIDA</div>
        {isNewRecord && <div className="new-record">★ ¡NUEVO RÉCORD! ★</div>}
        <div className="final-score">{stats.score.toLocaleString('es')}</div>
        <div className="final-label">puntos</div>

        <div className="stats-grid">
          <div className="stat">
            <span className="stat-v">{stats.birdsDown}</span>
            <span className="stat-l">aves</span>
          </div>
          <div className="stat">
            <span className="stat-v">{acc}%</span>
            <span className="stat-l">precisión</span>
          </div>
          <div className="stat">
            <span className="stat-v">{stats.bestStreak}</span>
            <span className="stat-l">mejor racha</span>
          </div>
          <div className="stat">
            <span className="stat-v">{stats.shots}</span>
            <span className="stat-l">disparos</span>
          </div>
        </div>

        <div className="menu-buttons">
          <button className="btn btn-primary" onClick={onRetry}>↻&nbsp; Reintentar</button>
          <button className="btn" onClick={onMenu}>☰&nbsp; Menú</button>
        </div>
      </div>
    </div>
  )
}
