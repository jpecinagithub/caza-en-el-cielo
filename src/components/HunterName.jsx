import { useState } from 'react'

// Pide el nombre del cazador antes de cada partida.
// El nombre se reutiliza como valor inicial en la próxima vez.
export default function HunterName({ initialName, onConfirm, onCancel }) {
  const [name, setName] = useState(initialName || '')

  const confirm = () => {
    const clean = name.trim().slice(0, 16) || 'Cazador'
    onConfirm(clean)
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal hunter-modal" onClick={(e) => e.stopPropagation()}>
        <h2>🏹 Nombre del cazador</h2>
        <p className="hunter-sub">
          Se usará para el ranking de mejores puntuaciones.
        </p>
        <input
          className="hunter-input"
          autoFocus
          maxLength={16}
          placeholder="Escribe tu nombre…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') confirm() }}
        />
        <div className="menu-buttons">
          <button className="btn btn-primary" onClick={confirm}>
            ¡A cazar!
          </button>
          <button className="btn" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
