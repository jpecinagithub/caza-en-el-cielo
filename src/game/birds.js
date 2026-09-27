// ============================================================
// birds.js — especies, spawn, patrones de vuelo y dibujo procedural
// ============================================================

// Paletas y parámetros por especie
export const SPECIES = {
  gorrion: {
    id: 'gorrion',
    name: 'Gorrión',
    radius: 13,
    speed: 265,
    points: 10,
    weight: 34,
    flapSpeed: 15,
    pattern: 'zigzag',
    colors: {
      body: '#8a6b4f', belly: '#c9ae8a', wing: '#6f543d', wingTip: '#54402e',
      head: '#7a5c43', beak: '#e0a458', tail: '#5d4632',
    },
    wingSweep: 0.6,
  },
  paloma: {
    id: 'paloma',
    name: 'Paloma',
    radius: 19,
    speed: 175,
    points: 20,
    weight: 28,
    flapSpeed: 10,
    pattern: 'sine',
    colors: {
      body: '#8d99a8', belly: '#c3ccd6', wing: '#707b8a', wingTip: '#525b66',
      head: '#7c8794', beak: '#e0a458', tail: '#5c6570', neck: '#5aa66a',
    },
    wingSweep: 0.8,
  },
  pato: {
    id: 'pato',
    name: 'Pato',
    radius: 27,
    speed: 125,
    points: 40,
    weight: 14,
    flapSpeed: 7,
    pattern: 'sine',
    colors: {
      body: '#7a5b3f', belly: '#a8895f', wing: '#5f4630', wingTip: '#4a3826',
      head: '#2e7d4f', beak: '#f2b134', tail: '#4a3826', neck: '#f5f0e6',
    },
    wingSweep: 1.0,
  },
  halcon: {
    id: 'halcon',
    name: 'Halcón',
    radius: 20,
    speed: 345,
    points: 80,
    weight: 8,
    flapSpeed: 12,
    pattern: 'dive',
    colors: {
      body: '#4a4f5a', belly: '#9aa0ad', wing: '#353a44', wingTip: '#23262d',
      head: '#3a3f49', beak: '#f2c14e', tail: '#2c3038',
    },
    wingSweep: 1.35,
  },
  dorada: {
    id: 'dorada',
    name: 'Ave dorada',
    radius: 17,
    speed: 205,
    points: 150,
    weight: 2,
    flapSpeed: 13,
    pattern: 'erratic',
    colors: {
      body: '#f2b134', belly: '#ffe08a', wing: '#d99a26', wingTip: '#b57a1a',
      head: '#f7c948', beak: '#ff8c42', tail: '#d99a26',
    },
    wingSweep: 0.9,
    glow: true,
  },
}

const SPECIES_LIST = Object.values(SPECIES)
const TOTAL_WEIGHT = SPECIES_LIST.reduce((s, sp) => s + sp.weight, 0)

let birdId = 1

function pickSpecies(rand = Math.random) {
  let r = rand() * TOTAL_WEIGHT
  for (const sp of SPECIES_LIST) {
    r -= sp.weight
    if (r <= 0) return sp
  }
  return SPECIES.gorrion
}

// Crea un ave nueva entrando por un lateral
export function spawnBird(width, height, opts = {}) {
  const { speedMul = 1, forceSpecies = null } = opts
  const sp = forceSpecies ? SPECIES[forceSpecies] : pickSpecies()
  const dir = Math.random() < 0.5 ? 1 : -1 // 1 = izquierda→derecha
  const margin = 60
  const y = height * 0.08 + Math.random() * height * 0.47
  const speed = sp.speed * speedMul * (0.9 + Math.random() * 0.25)

  return {
    id: birdId++,
    species: sp,
    x: dir === 1 ? -margin : width + margin,
    y,
    baseY: y,
    dir,
    vx: dir * speed,
    radius: sp.radius,
    flapPhase: Math.random() * Math.PI * 2,
    flapSpeed: sp.flapSpeed * (0.9 + Math.random() * 0.2),
    // parámetros del patrón de vuelo
    amp: 20 + Math.random() * 55,
    freq: 1.2 + Math.random() * 2.2,
    phase: Math.random() * Math.PI * 2,
    zigT: 0,
    zigInterval: 0.5 + Math.random() * 0.7,
    zigDir: Math.random() < 0.5 ? -1 : 1,
    zigVy: 0,
    progress: 0, // progreso de cruce (para el picado)
    errSeed: Math.random() * 100,
    alive: true,
    dead: false,
    deadT: 0,
    rot: 0,
    vy: 0,
    age: 0,
  }
}

// Actualiza posición y animación. Devuelve false si el ave salió de pantalla.
export function updateBird(b, dt, width, height) {
  b.age += dt

  if (b.dead) {
    // Caída girando con física simple
    b.deadT += dt
    b.vy += 900 * dt
    b.vy = Math.min(b.vy, 520)
    b.x += b.vx * 0.25 * dt
    b.y += b.vy * dt
    b.rot += (b.dir * 6 + b.deadT * 4) * dt
    return b.y < height + 80 && b.deadT < 2.2
  }

  const sp = b.species
  const prevX = b.x
  b.x += b.vx * dt
  b.progress = Math.abs(b.x - (b.dir === 1 ? -60 : width + 60)) / (width + 120)
  b.flapPhase += dt * b.flapSpeed

  const t = b.age
  switch (sp.pattern) {
    case 'sine': {
      b.y = b.baseY + Math.sin(t * b.freq + b.phase) * b.amp
      break
    }
    case 'zigzag': {
      b.zigT += dt
      if (b.zigT >= b.zigInterval) {
        b.zigT = 0
        b.zigInterval = 0.4 + Math.random() * 0.7
        b.zigDir *= -1
      }
      const targetVy = b.zigDir * (70 + b.amp)
      b.zigVy += (targetVy - b.zigVy) * Math.min(1, dt * 6)
      b.y += b.zigVy * dt
      b.baseY = b.y
      break
    }
    case 'dive': {
      // Picado: desciende a mitad de pantalla y remonta
      const p = Math.min(1, Math.max(0, b.progress))
      b.y = b.baseY + Math.sin(p * Math.PI) * (90 + b.amp * 0.6)
      break
    }
    case 'erratic': {
      // Vuelo errático: suma de senos + sacudidas
      const s = b.errSeed
      b.y += (
        Math.sin(t * 3.1 + s) * 90 +
        Math.sin(t * 7.3 + s * 2) * 45 +
        Math.sin(t * 0.9 + s) * 30
      ) * dt
      b.x += Math.sin(t * 2.2 + s * 3) * 60 * dt * b.dir
      b.baseY += (Math.max(60, Math.min(height * 0.62, b.y)) - b.baseY) * dt * 0.5
      break
    }
    default: { // 'straight'
      b.y = b.baseY + Math.sin(t * 2 + b.phase) * 8
    }
  }

  // Mantener dentro de límites verticales razonables
  const minY = 40
  const maxY = height * 0.68
  if (b.y < minY) { b.y = minY; b.baseY = Math.max(b.baseY, minY); b.zigDir = 1 }
  if (b.y > maxY) { b.y = maxY; b.baseY = Math.min(b.baseY, maxY); b.zigDir = -1 }

  // ¿Salió por el lateral opuesto?
  if (b.dir === 1 && b.x > width + 70) return false
  if (b.dir === -1 && b.x < -70) return false
  return true
}

// Marca el ave como muerta (inicia la caída)
export function killBird(b) {
  b.dead = true
  b.deadT = 0
  b.vy = -120 - Math.random() * 80 // pequeño impulso hacia arriba
  b.vx = b.vx * 0.25
}

// Radio de impacto: radioBaseDelAve × toleranciaDisparo
export function impactRadius(bird, tolerance) {
  return bird.radius * tolerance
}

// ============================================================
// Dibujo procedural de cada ave en canvas
// ============================================================
export function drawBird(ctx, b) {
  const sp = b.species
  const c = sp.colors
  const r = b.radius
  const dir = b.dir

  ctx.save()
  ctx.translate(b.x, b.y)
  if (b.dead) {
    ctx.rotate(b.rot)
    ctx.globalAlpha = Math.max(0, 1 - b.deadT / 2.2)
  } else {
    ctx.scale(dir, 1)
  }

  if (sp.glow && !b.dead) {
    ctx.shadowColor = 'rgba(255, 200, 60, 0.8)'
    ctx.shadowBlur = 18
  }

  const flap = Math.sin(b.flapPhase)
  const flap2 = Math.sin(b.flapPhase + 0.9) // segunda fase (ala lejana)

  // --- Cola ---
  ctx.fillStyle = c.tail
  ctx.beginPath()
  ctx.moveTo(-r * 0.9, -r * 0.1)
  ctx.lineTo(-r * 1.7, -r * 0.35 - flap * r * 0.1)
  ctx.lineTo(-r * 1.65, r * 0.25)
  ctx.lineTo(-r * 0.9, r * 0.15)
  ctx.closePath()
  ctx.fill()

  // --- Ala lejana (más oscura, fase desplazada) ---
  drawWing(ctx, c.wingTip, r, flap2, sp.wingSweep, true)

  // --- Cuerpo ---
  const grad = ctx.createLinearGradient(0, -r * 0.7, 0, r * 0.7)
  grad.addColorStop(0, c.body)
  grad.addColorStop(1, c.belly)
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.ellipse(0, 0, r * 1.05, r * 0.62, -0.08, 0, Math.PI * 2)
  ctx.fill()

  // --- Cabeza ---
  ctx.fillStyle = c.head
  ctx.beginPath()
  ctx.arc(r * 0.85, -r * 0.28, r * 0.42, 0, Math.PI * 2)
  ctx.fill()

  // Anillo del cuello (pato) / brillo del cuello (paloma)
  if (c.neck) {
    ctx.strokeStyle = c.neck
    ctx.lineWidth = Math.max(1.5, r * 0.1)
    ctx.beginPath()
    ctx.arc(r * 0.62, -r * 0.2, r * 0.34, -0.6, 1.1)
    ctx.stroke()
  }

  // --- Pico ---
  ctx.fillStyle = c.beak
  ctx.beginPath()
  ctx.moveTo(r * 1.2, -r * 0.34)
  ctx.lineTo(r * 1.62, -r * 0.2)
  ctx.lineTo(r * 1.2, -r * 0.1)
  ctx.closePath()
  ctx.fill()

  // --- Ojo ---
  ctx.fillStyle = '#1a1a1a'
  ctx.beginPath()
  ctx.arc(r * 0.92, -r * 0.34, Math.max(1.6, r * 0.09), 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.beginPath()
  ctx.arc(r * 0.95, -r * 0.37, Math.max(0.7, r * 0.035), 0, Math.PI * 2)
  ctx.fill()

  // --- Ala cercana (animada) ---
  drawWing(ctx, c.wing, r, flap, sp.wingSweep, false)

  ctx.restore()
}

function drawWing(ctx, color, r, flap, sweep, far) {
  const lift = flap * r * (far ? 0.55 : 0.85) // amplitud del aleteo
  const len = r * (1.25 + sweep * 0.55)
  const liftDir = far ? -1 : 1

  ctx.save()
  ctx.translate(-r * 0.1, -r * 0.15)
  ctx.fillStyle = color
  ctx.beginPath()
  // Hombro
  ctx.moveTo(r * 0.25, 0)
  // Borde de ataque hasta la punta (sube/baja con el aleteo)
  const tipX = -r * 0.2 - len * 0.55
  const tipY = -lift * liftDir - r * 0.35
  ctx.quadraticCurveTo(-r * 0.35, -r * 0.1 - lift * liftDir * 0.6, tipX, tipY)
  // Punta del ala (afilada según sweep)
  const tip2X = tipX - len * 0.35 * sweep
  const tip2Y = tipY + r * 0.28
  ctx.quadraticCurveTo(tipX - len * 0.18 * sweep, tipY + r * 0.12, tip2X, tip2Y)
  // Borde de fuga de vuelta al cuerpo
  ctx.quadraticCurveTo(-r * 0.3, r * 0.18, r * 0.3, r * 0.12)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

// Silueta lejana decorativa (no disparable)
export function drawDistantBird(ctx, x, y, size, flapPhase, alpha) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = '#2b3440'
  ctx.translate(x, y)
  const w = Math.sin(flapPhase) * size * 0.5
  ctx.beginPath()
  ctx.moveTo(-size, 0)
  ctx.quadraticCurveTo(-size * 0.4, -size * 0.5 - w, 0, 0)
  ctx.quadraticCurveTo(size * 0.4, -size * 0.5 - w, size, 0)
  ctx.quadraticCurveTo(size * 0.4, -size * 0.15 - w * 0.4, 0, size * 0.12)
  ctx.quadraticCurveTo(-size * 0.4, -size * 0.15 - w * 0.4, -size, 0)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}
