import React from 'react'
import { DIFFICULTY_LEVELS, resolveTolerance } from '../game/config.js'

// Ajustes persistentes: se aplican EN VIVO sin recargar
export default function Settings({ settings, onChange, onClose }) {
  const set = (patch) => onChange({ ...settings, ...patch })
  const tol = resolveTolerance(settings)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>⚙ Ajustes</h2>

        <section>
          <h3>Dificultad / tolerancia de disparo</h3>
          <div className="diff-grid">
            {DIFFICULTY_LEVELS.map((d) => (
              <button
                key={d.id}
                className={`diff-btn ${!settings.useSlider && settings.difficultyId === d.id ? 'active' : ''}`}
                onClick={() => set({ difficultyId: d.id, useSlider: false })}
              >
                <span className="diff-name">{d.name}</span>
                <span className="diff-tol">×{d.tolerance.toFixed(1)}</span>
                <span className="diff-desc">{d.desc}</span>
              </button>
            ))}
          </div>
          <label className="slider-row">
            <span>Personalizado: <strong>×{settings.sliderTolerance.toFixed(2)}</strong></span>
            <input
              type="range" min="0.5" max="2.0" step="0.05"
              value={settings.sliderTolerance}
              onChange={(e) => set({ sliderTolerance: parseFloat(e.target.value), useSlider: true })}
            />
          </label>
          <div className="tol-current">
            Radio de impacto actual: <strong>×{tol.toFixed(2)}</strong>
            {settings.useSlider && <em> (personalizado)</em>}
          </div>
        </section>

        <section>
          <h3>Sonido</h3>
          <label className="slider-row">
            <span>Volumen general: <strong>{Math.round(settings.masterVolume * 100)}%</strong></span>
            <input
              type="range" min="0" max="1" step="0.05"
              value={settings.masterVolume}
              onChange={(e) => set({ masterVolume: parseFloat(e.target.value) })}
            />
          </label>
          <label className="slider-row">
            <span>Efectos: <strong>{Math.round(settings.sfxVolume * 100)}%</strong></span>
            <input
              type="range" min="0" max="1" step="0.05"
              value={settings.sfxVolume}
              onChange={(e) => set({ sfxVolume: parseFloat(e.target.value) })}
            />
          </label>
        </section>

        <section>
          <h3>Gráficos</h3>
          <div className="seg">
            {['alta', 'baja'].map((q) => (
              <button
                key={q}
                className={`seg-btn ${settings.quality === q ? 'active' : ''}`}
                onClick={() => set({ quality: q })}
              >
                {q === 'alta' ? 'Alta calidad' : 'Baja calidad'}
              </button>
            ))}
          </div>
          <label className="check-row">
            <input
              type="checkbox"
              checked={settings.shake}
              onChange={(e) => set({ shake: e.target.checked })}
            />
            <span>Sacudida de pantalla al disparar</span>
          </label>
        </section>

        <button className="btn btn-primary btn-block" onClick={onClose}>
          Listo
        </button>
      </div>
    </div>
  )
}
