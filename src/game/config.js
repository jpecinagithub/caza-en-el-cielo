// ============================================================
// config.js — balance, dificultad, ajustes y persistencia
// ============================================================

export const DIFFICULTY_LEVELS = [
  {
    id: 'principiante',
    name: 'Principiante',
    desc: 'Radio de impacto generoso',
    tolerance: 1.8,
    speedMul: 0.85,
    spawnMul: 0.85,
    scoreMul: 0.7,
  },
  {
    id: 'cazador',
    name: 'Cazador',
    desc: 'El equilibrio clásico',
    tolerance: 1.3,
    speedMul: 1.0,
    spawnMul: 1.0,
    scoreMul: 1.0,
  },
  {
    id: 'experto',
    name: 'Experto',
    desc: 'Puntería exigente, más puntos',
    tolerance: 1.0,
    speedMul: 1.15,
    spawnMul: 1.2,
    scoreMul: 1.4,
  },
  {
    id: 'leyenda',
    name: 'Leyenda',
    desc: 'Solo para francotiradores',
    tolerance: 0.7,
    speedMul: 1.3,
    spawnMul: 1.35,
    scoreMul: 2.0,
  },
]

export const DEFAULT_SETTINGS = {
  difficultyId: 'cazador',   // nivel elegido (o 'custom' si se usa el deslizador)
  sliderTolerance: 1.3,     // valor del deslizador 0.5 - 2.0
  useSlider: false,          // true = el deslizador manda sobre el nivel
  masterVolume: 0.8,         // 0 - 1
  sfxVolume: 0.8,            // 0 - 1
  quality: 'alta',           // 'alta' | 'baja'
  shake: true,               // sacudida de pantalla
}

export const SETTINGS_KEY = 'caza-en-el-cielo-settings-v1'
export const RECORDS_KEY = 'caza-en-el-cielo-records-v1'
export const HUNTER_KEY = 'caza-en-el-cielo-hunter-v1'
export const MAX_RANKING = 10

export const GAME = {
  duration: 90,          // segundos por partida
  fireCooldown: 0.18,    // cadencia mínima entre disparos (s)
  comboHits: 5,          // aciertos seguidos para subir un nivel de combo
  comboMax: 8,           // multiplicador máximo
  goldenTimeBonus: 5,    // segundos extra del ave dorada
  goldenScoreMul: 5,     // multiplicador de puntos del ave dorada
}

export const WAVES = [
  { until: 30, spawnInterval: 1.15, speedMul: 1.0, label: 'Oleada 1' },
  { until: 60, spawnInterval: 0.9, speedMul: 1.12, label: 'Oleada 2' },
  { until: 1e9, spawnInterval: 0.68, speedMul: 1.25, label: 'Oleada final' },
]

// Resuelve la tolerancia efectiva según ajustes
export function resolveTolerance(settings) {
  if (settings.useSlider) return clamp(settings.sliderTolerance, 0.5, 2.0)
  const lvl = DIFFICULTY_LEVELS.find((d) => d.id === settings.difficultyId)
  return lvl ? lvl.tolerance : 1.3
}

// Multiplicadores de velocidad/spawn/puntos (nivel + deslizador personalizado)
export function resolveDifficulty(settings) {
  const lvl = DIFFICULTY_LEVELS.find((d) => d.id === settings.difficultyId)
  if (settings.useSlider || !lvl) {
    // Con deslizador personalizado: a menor tolerancia, más velocidad y puntos
    const t = resolveTolerance(settings)
    const k = (1.3 / t)
    return {
      tolerance: t,
      speedMul: 0.9 + 0.25 * k,
      spawnMul: 0.95 + 0.2 * k,
      scoreMul: Math.pow(1.3 / t, 1.6),
    }
  }
  return { tolerance: lvl.tolerance, speedMul: lvl.speedMul, spawnMul: lvl.spawnMul, scoreMul: lvl.scoreMul }
}

export function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // almacenamiento no disponible: se ignora sin romper el juego
  }
}

export function loadRecords() {
  const empty = { ranking: [], games: 0 }
  try {
    const raw = localStorage.getItem(RECORDS_KEY)
    if (!raw) return empty
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed.ranking)) {
      return {
        ranking: parsed.ranking.slice(0, MAX_RANKING),
        games: parsed.games || 0,
      }
    }
    // migración desde el formato antiguo { best, bestDate, games }
    const ranking = parsed.best > 0
      ? [{ name: 'Cazador', score: parsed.best, date: parsed.bestDate || null }]
      : []
    return { ranking, games: parsed.games || 0 }
  } catch {
    return empty
  }
}

export function saveRecords(records) {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records))
  } catch {
    // idem
  }
}

// Borra todos los datos del ranking (entradas y contador de partidas)
export function clearRecords() {
  try {
    localStorage.removeItem(RECORDS_KEY)
  } catch {
    // idem
  }
}

// Inserta una entrada en el ranking (descendente por puntos, top MAX_RANKING).
// Devuelve el ranking nuevo y la posición (0-based) o -1 si no entra.
export function insertRanking(ranking, entry) {
  const next = [...ranking, entry].sort((a, b) => b.score - a.score).slice(0, MAX_RANKING)
  return { ranking: next, rank: next.indexOf(entry) }
}

export function loadHunter() {
  try {
    return localStorage.getItem(HUNTER_KEY) || ''
  } catch {
    return ''
  }
}

export function saveHunter(name) {
  try {
    localStorage.setItem(HUNTER_KEY, name)
  } catch {
    // idem
  }
}
