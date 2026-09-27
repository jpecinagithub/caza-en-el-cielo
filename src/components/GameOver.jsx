import React from 'react'
import { MAX_RANKING } from '../game/config.js'

// RecordsView: ranking completo de mejores puntuaciones (top 10)
export function RecordsView({ ranking, games, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>🏆 Récords</h2>
        {ranking.length > 0 ? (
          <div className="records-body">
            <ol className="ranking-list full">
              {ranking.map((r, i) => (
                <li key={`${r.date}-${i}`} className={i === 0 ? 'first' : ''}>
                  <span className="rk-pos">{i + 1}</span>
                  <span className="rk-name">{r.name}</span>
                  <span className="rk-score">{r.score.toLocaleString('es')}</span>
                </li>
              ))}
            </ol>
            <div className="record-games">
              {games} {games === 1 ? 'partida jugada' : 'partidas jugadas'} · top {MAX_RANKING}
            </div>
          </div>
        ) : (
          <p className="records-empty">Aún no hay marcas. ¡Sal a cazar y vuelve con un récord!</p>
        )}
        <button className="btn btn-primary btn-block" onClick={onClose}>Cerrar</button>
      </div>
    </div>
  )
}

// Fin de partida: puntuación, puesto en el ranking, estadísticas y reintentar
export default function GameOver({ stats, ranking, rank, onRetry, onMenu }) {
  const acc = Math.round(stats.accuracy * 100)
  const top = ranking.slice(0, 5)
  return (
    <div className="modal-backdrop">
      <div className="modal gameover">
        <div className="menu-kicker">FIN DE LA PARTIDA</div>
        {rank >= 0 ? (
          <div className="new-record">★ ¡Puesto #{rank + 1} del ranking! ★</div>
        ) : (
          <div className="no-rank">No entraste en el top {MAX_RANKING}… ¡la próxima será!</div>
        )}
        <div className="final-score">{stats.score.toLocaleString('es')}</div>
        <div className="final-label">puntos · {stats.hunterName}</div>

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

        {top.length > 0 && (
          <div className="menu-ranking">
            <div className="ranking-title">🏆 Mejores cazadores</div>
            <ol className="ranking-list">
              {top.map((r, i) => (
                <li key={`${r.date}-${i}`} className={`${i === 0 ? 'first' : ''} ${i === rank ? 'me' : ''}`}>
                  <span className="rk-pos">{i + 1}</span>
                  <span className="rk-name">{r.name}</span>
                  <span className="rk-score">{r.score.toLocaleString('es')}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="menu-buttons">
          <button className="btn btn-primary" onClick={onRetry}>↻&nbsp; Reintentar</button>
          <button className="btn" onClick={onMenu}>☰&nbsp; Menú</button>
        </div>
      </div>
    </div>
  )
}
