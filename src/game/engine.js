// ============================================================
// engine.js — bucle de juego, colisiones, escenario y oleadas
// Render desacoplado de React: todo el dibujo vive en el canvas.
// ============================================================

import {
  spawnBird, updateBird, killBird, drawBird, drawDistantBird, impactRadius,
} from './birds.js'
import { createEffects } from './effects.js'
import { createAudioEngine } from './audio.js'
import { GAME, WAVES, resolveTolerance, resolveDifficulty, clamp } from './config.js'

// Keyframes del ciclo de día: amanecer -> mediodía -> atardecer -> amanecer
const DAY_KEYS = [
  { // amanecer
    top: [62, 88, 150], mid: [150, 170, 208], bot: [250, 190, 120],
    sun: [0.78, 0.62], sunColor: '#ffd9a0', glow: 0.9,
    light: [255, 214, 160], lightAmt: 0.28, fog: [232, 200, 170],
    cloud: [255, 226, 196], moon: 0.55,
  },
  { // mediodía
    top: [43, 122, 205], mid: [122, 188, 238], bot: [208, 234, 247],
    sun: [0.5, 0.22], sunColor: '#fff6d8', glow: 0.55,
    light: [255, 255, 255], lightAmt: 0.06, fog: [200, 222, 240],
    cloud: [255, 255, 255], moon: 0,
  },
  { // atardecer
    top: [54, 52, 104], mid: [196, 96, 76], bot: [250, 170, 80],
    sun: [0.22, 0.6], sunColor: '#ff9d4d', glow: 1.0,
    light: [255, 170, 110], lightAmt: 0.34, fog: [238, 170, 130],
    cloud: [255, 200, 160], moon: 0.25,
  },
  { // vuelta al amanecer
    top: [62, 88, 150], mid: [150, 170, 208], bot: [250, 190, 120],
    sun: [0.78, 0.62], sunColor: '#ffd9a0', glow: 0.9,
    light: [255, 214, 160], lightAmt: 0.28, fog: [232, 200, 170],
    cloud: [255, 226, 196], moon: 0.55,
  },
]

function lerp(a, b, t) { return a + (b - a) * t }
function lerpC(c1, c2, t) {
  return [lerp(c1[0], c2[0], t) | 0, lerp(c1[1], c2[1], t) | 0, lerp(c1[2], c2[2], t) | 0]
}
function rgb(c, a = 1) { return `rgba(${c[0]},${c[1]},${c[2]},${a})` }

function sampleDay(t) {
  const n = DAY_KEYS.length - 1
  const x = ((t % 1) + 1) % 1 * n
  const i = Math.floor(x)
  const f = x - i
  const A = DAY_KEYS[i]
  const B = DAY_KEYS[Math.min(n, i + 1)]
  // suavizado
  const s = f * f * (3 - 2 * f)
  return {
    top: lerpC(A.top, B.top, s),
    mid: lerpC(A.mid, B.mid, s),
    bot: lerpC(A.bot, B.bot, s),
    sun: [lerp(A.sun[0], B.sun[0], s), lerp(A.sun[1], B.sun[1], s)],
    sunColor: s < 0.5 ? A.sunColor : B.sunColor,
    glow: lerp(A.glow, B.glow, s),
    light: lerpC(A.light, B.light, s),
    lightAmt: lerp(A.lightAmt, B.lightAmt, s),
    fog: lerpC(A.fog, B.fog, s),
    cloud: lerpC(A.cloud, B.cloud, s),
    moon: lerp(A.moon, B.moon, s),
  }
}

export function createEngine(canvas, opts) {
  const { getSettings, onHUD, onGameOver } = opts
  const ctx = canvas.getContext('2d')

  const audio = createAudioEngine()
  let effects = createEffects(getSettings().quality)

  // ---------- estado ----------
  const S = {
    mode: 'attract', // attract | countdown | playing | paused | over
    w: 0, h: 0, dpr: 1,
    time: 0,           // tiempo global (fondo)
    dayT: 0.12,        // posición en el ciclo de día
    gameT: 0,          // tiempo de partida
    timeLeft: GAME.duration,
    countdownT: 0,
    countdownN: 3,
    score: 0,
    shots: 0,
    hits: 0,
    birdsDown: 0,
    streak: 0,
    bestStreak: 0,
    combo: 1,
    waveIdx: 0,
    spawnT: 0,
    cooldown: 0,
    goldenSpawned: false,
    objectiveDone: false,
    birds: [],
    shakeT: 0,
    shakeMag: 0,
    mouse: { x: 0, y: 0, inside: false },
    kick: 0, // animación del crosshair al disparar
    hudT: 0,
    // nubes por capa
    clouds: [],
    // aves decorativas lejanas
    distant: [],
    // partículas ambientales
    pollen: [],
    leaves: [],
    leafT: 0,
    grassSeed: [],
    flowers: [],
    trees: [],
    cabin: null,
    flutterT: 0,
    skyCache: { t: -1, grad: null },
  }

  const OBJECTIVE = 30

  // ---------- helpers ----------
  function rand(a, b) { return a + Math.random() * (b - a) }

  function difficulty() { return resolveDifficulty(getSettings()) }
  function tolerance() { return resolveTolerance(getSettings()) }

  function resize() {
    const rect = canvas.getBoundingClientRect()
    const q = getSettings().quality
    S.dpr = q === 'alta' ? Math.min(2, window.devicePixelRatio || 1) : 1
    S.w = Math.max(320, rect.width)
    S.h = Math.max(240, rect.height)
    canvas.width = Math.round(S.w * S.dpr)
    canvas.height = Math.round(S.h * S.dpr)
    ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0)
    buildScenery()
    S.skyCache.t = -1
  }

  function buildScenery() {
    const { w, h } = S
    const q = getSettings().quality
    const hiQ = q === 'alta'
    // nubes: dos capas de profundidad
    S.clouds = []
    const nC = hiQ ? 9 : 5
    for (let i = 0; i < nC; i++) {
      const layer = i % 2 // 0 = alta/lenta, 1 = baja/rápida
      S.clouds.push({
        x: rand(0, w), y: rand(h * 0.04, h * (layer ? 0.42 : 0.3)),
        s: rand(0.6, 1.4) * (layer ? 1.25 : 0.9),
        v: rand(6, 16) * (layer ? 1.8 : 1),
        a: rand(0.5, 0.85),
      })
    }
    // aves decorativas
    S.distant = []
    for (let i = 0; i < 6; i++) {
      S.distant.push({
        x: rand(0, w), y: rand(h * 0.1, h * 0.4),
        v: rand(20, 55) * (Math.random() < 0.5 ? 1 : -1),
        size: rand(7, 13), phase: rand(0, 6.28), fs: rand(4, 7),
        a: rand(0.25, 0.5),
      })
    }
    // polen / polvo ambiental
    S.pollen = []
    const nP = hiQ ? 46 : 18
    for (let i = 0; i < nP; i++) {
      S.pollen.push({
        x: rand(0, w), y: rand(0, h),
        vx: rand(-14, 14), vy: rand(-10, 6),
        s: rand(1, 2.6), phase: rand(0, 6.28),
      })
    }
    S.leaves = []
    // hierba del primer plano (posiciones fijas, animación por seno)
    S.grassSeed = []
    const nG = hiQ ? 150 : 60
    for (let i = 0; i < nG; i++) {
      S.grassSeed.push({
        x: rand(0, w), hgt: rand(18, 52), phase: rand(0, 6.28),
        hue: rand(88, 120), dark: Math.random() < 0.4,
      })
    }
    // flores
    S.flowers = []
    const nF = hiQ ? 34 : 14
    const petalCols = ['#ff6b81', '#ffd166', '#f7f7ff', '#c084fc', '#ff9d5c']
    for (let i = 0; i < nF; i++) {
      S.flowers.push({
        x: rand(0, w), y: h - rand(4, 26),
        c: petalCols[(Math.random() * petalCols.length) | 0],
        s: rand(3, 5.5), phase: rand(0, 6.28),
      })
    }
    // árboles de las colinas
    S.trees = []
    const nT = hiQ ? 26 : 12
    for (let i = 0; i < nT; i++) {
      S.trees.push({
        x: rand(0, w), y: h * rand(0.62, 0.78),
        s: rand(14, 30), tone: rand(0, 1),
      })
    }
    S.cabin = { x: w * rand(0.6, 0.85), y: h * 0.72, s: rand(0.8, 1.1) }
  }

  // ---------- escenario ----------
  function skyGradient(day) {
    if (Math.abs(S.dayT - S.skyCache.t) > 0.002 || !S.skyCache.grad) {
      const g = ctx.createLinearGradient(0, 0, 0, S.h)
      g.addColorStop(0, rgb(day.top))
      g.addColorStop(0.55, rgb(day.mid))
      g.addColorStop(1, rgb(day.bot))
      S.skyCache = { t: S.dayT, grad: g }
    }
    return S.skyCache.grad
  }

  function drawSky(day) {
    ctx.fillStyle = skyGradient(day)
    ctx.fillRect(0, 0, S.w, S.h)

    // sol con halo
    const sx = day.sun[0] * S.w
    const sy = day.sun[1] * S.h
    const sr = Math.min(S.w, S.h) * 0.055
    const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * (4 + day.glow * 3))
    halo.addColorStop(0, day.sunColor)
    halo.addColorStop(0.25, day.sunColor + '')
    halo.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.save()
    ctx.globalAlpha = 0.55 + day.glow * 0.3
    ctx.fillStyle = halo
    ctx.fillRect(sx - sr * 8, sy - sr * 8, sr * 16, sr * 16)
    ctx.fillStyle = day.sunColor
    ctx.beginPath()
    ctx.arc(sx, sy, sr, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // luna (visible en transiciones)
    if (day.moon > 0.03) {
      const mx = S.w * 0.16
      const my = S.h * 0.16
      const mr = Math.min(S.w, S.h) * 0.035
      ctx.save()
      ctx.globalAlpha = day.moon
      ctx.fillStyle = '#f4f1e4'
      ctx.beginPath()
      ctx.arc(mx, my, mr, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = rgb(day.top)
      ctx.beginPath()
      ctx.arc(mx + mr * 0.45, my - mr * 0.2, mr * 0.9, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    // nubes a la deriva (2 profundidades)
    for (const c of S.clouds) {
      drawCloud(c.x, c.y, c.s, rgb(day.cloud, c.a * 0.92))
    }
  }

  function drawCloud(x, y, s, color) {
    ctx.save()
    ctx.fillStyle = color
    const u = 26 * s
    ctx.beginPath()
    ctx.arc(x, y, u * 0.7, 0, Math.PI * 2)
    ctx.arc(x - u * 0.75, y + u * 0.18, u * 0.5, 0, Math.PI * 2)
    ctx.arc(x + u * 0.75, y + u * 0.18, u * 0.52, 0, Math.PI * 2)
    ctx.arc(x + u * 0.1, y - u * 0.35, u * 0.55, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  function ridgeY(x, seed, base, amp) {
    return base
      + Math.sin(x * 0.004 + seed) * amp
      + Math.sin(x * 0.011 + seed * 2.3) * amp * 0.45
      + Math.sin(x * 0.027 + seed * 4.1) * amp * 0.18
  }

  function drawMountains(day) {
    // cordillera lejana (más niebla) y cercana
    const layers = [
      { base: S.h * 0.52, amp: S.h * 0.075, seed: 3.1, fogAmt: 0.62, col: [96, 116, 150] },
      { base: S.h * 0.60, amp: S.h * 0.06, seed: 9.7, fogAmt: 0.35, col: [74, 94, 128] },
    ]
    for (const L of layers) {
      ctx.beginPath()
      ctx.moveTo(-4, S.h)
      for (let x = -4; x <= S.w + 4; x += 8) {
        ctx.lineTo(x, ridgeY(x, L.seed, L.base, L.amp))
      }
      ctx.lineTo(S.w + 4, S.h)
      ctx.closePath()
      const mc = lerpC(L.col, day.fog, L.fogAmt)
      const g = ctx.createLinearGradient(0, L.base - L.amp * 2, 0, S.h * 0.72)
      g.addColorStop(0, rgb(mc))
      g.addColorStop(1, rgb(lerpC(mc, day.fog, 0.55)))
      ctx.fillStyle = g
      ctx.fill()
      // nieve en picos altos
      ctx.fillStyle = rgb(lerpC([245, 248, 252], day.fog, L.fogAmt * 0.7), 0.85)
      for (let x = 20; x < S.w; x += 90) {
        const py = ridgeY(x, L.seed, L.base, L.amp)
        const py2 = ridgeY(x + 30, L.seed, L.base, L.amp)
        if (py < L.base - L.amp * 0.9 && py2 > py) {
          ctx.beginPath()
          ctx.moveTo(x - 14, py + 16)
          ctx.lineTo(x, py)
          ctx.lineTo(x + 14, py + 16)
          ctx.closePath()
          ctx.fill()
        }
      }
    }
  }

  function drawHills(day) {
    // colinas verdes
    ctx.beginPath()
    ctx.moveTo(-4, S.h)
    for (let x = -4; x <= S.w + 4; x += 10) {
      ctx.lineTo(x, ridgeY(x, 21.4, S.h * 0.74, S.h * 0.05))
    }
    ctx.lineTo(S.w + 4, S.h)
    ctx.closePath()
    const g = ctx.createLinearGradient(0, S.h * 0.62, 0, S.h)
    const c1 = lerpC([96, 148, 92], day.fog, 0.18)
    const c2 = lerpC([52, 102, 62], day.fog, 0.1)
    g.addColorStop(0, rgb(c1))
    g.addColorStop(1, rgb(c2))
    ctx.fillStyle = g
    ctx.fill()

    // sombras suaves de nubes sobre las colinas
    const hiQ = getSettings().quality === 'alta'
    ctx.save()
    for (let i = 0; i < (hiQ ? 3 : 2); i++) {
      const cx = ((S.time * 14 * (i + 1)) % (S.w + 400)) - 200
      const cy = S.h * (0.68 + i * 0.05)
      const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 150)
      rg.addColorStop(0, 'rgba(30,40,60,0.16)')
      rg.addColorStop(1, 'rgba(30,40,60,0)')
      ctx.fillStyle = rg
      ctx.fillRect(cx - 160, cy - 60, 320, 120)
    }
    ctx.restore()

    // árboles
    for (const t of S.trees) {
      drawTree(t.x, t.y, t.s, t.tone, day)
    }
    // cabaña
    drawCabin(S.cabin.x, S.cabin.y, S.cabin.s, day)
  }

  function drawTree(x, y, s, tone, day) {
    const dark = lerpC([34, 78, 44], day.fog, 0.12 + tone * 0.1)
    ctx.fillStyle = '#5a4028'
    ctx.fillRect(x - s * 0.07, y - s * 0.35, s * 0.14, s * 0.4)
    ctx.fillStyle = rgb(dark)
    for (let i = 0; i < 3; i++) {
      const w = s * (0.85 - i * 0.2)
      const yy = y - s * 0.25 - i * s * 0.32
      ctx.beginPath()
      ctx.moveTo(x - w / 2, yy)
      ctx.lineTo(x, yy - s * 0.5)
      ctx.lineTo(x + w / 2, yy)
      ctx.closePath()
      ctx.fill()
    }
  }

  function drawCabin(x, y, s, day) {
    const w = 64 * s
    const h = 40 * s
    ctx.save()
    ctx.translate(x, y)
    // cuerpo
    ctx.fillStyle = '#6e4f30'
    ctx.fillRect(-w / 2, -h, w, h)
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'
    ctx.lineWidth = 1.5
    for (let i = 1; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(-w / 2, -h + (h / 4) * i); ctx.lineTo(w / 2, -h + (h / 4) * i); ctx.stroke()
    }
    // tejado
    ctx.fillStyle = '#4a3421'
    ctx.beginPath()
    ctx.moveTo(-w / 2 - 8 * s, -h)
    ctx.lineTo(0, -h - 26 * s)
    ctx.lineTo(w / 2 + 8 * s, -h)
    ctx.closePath()
    ctx.fill()
    // ventana cálida
    const glow = 0.35 + day.lightAmt
    ctx.fillStyle = `rgba(255,190,90,${0.5 + glow * 0.5})`
    ctx.fillRect(-w * 0.28, -h * 0.72, w * 0.24, h * 0.4)
    ctx.fillStyle = '#3a2a18'
    ctx.fillRect(w * 0.12, -h * 0.8, w * 0.2, h * 0.8)
    // chimenea con humo
    ctx.fillStyle = '#555'
    ctx.fillRect(w * 0.22, -h - 40 * s, 10 * s, 22 * s)
    ctx.fillStyle = 'rgba(220,220,220,0.35)'
    for (let i = 0; i < 3; i++) {
      const ph = (S.time * 0.7 + i * 0.9) % 2.4
      const hx = w * 0.27 + Math.sin(ph * 3) * 8 * ph
      const hy = -h - 42 * s - ph * 26
      ctx.beginPath()
      ctx.arc(hx, hy, (4 + ph * 5) * s * 0.6, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  function drawForeground(day) {
    const { w, h } = S
    // base de hierba
    const g = ctx.createLinearGradient(0, h * 0.86, 0, h)
    g.addColorStop(0, rgb(lerpC([70, 128, 66], day.fog, 0.08)))
    g.addColorStop(1, rgb(lerpC([34, 84, 40], day.fog, 0.05)))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(0, h)
    ctx.lineTo(0, h * 0.9)
    for (let x = 0; x <= w; x += 24) {
      ctx.lineTo(x, h * 0.9 + Math.sin(x * 0.02 + 1.2) * 8)
    }
    ctx.lineTo(w, h)
    ctx.closePath()
    ctx.fill()

    // flores
    for (const f of S.flowers) {
      const sway = Math.sin(S.time * 1.6 + f.phase) * 3
      ctx.strokeStyle = '#2e6b2e'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(f.x, f.y + 12)
      ctx.quadraticCurveTo(f.x + sway * 0.5, f.y + 6, f.x + sway, f.y)
      ctx.stroke()
      ctx.fillStyle = f.c
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2 + f.phase
        ctx.beginPath()
        ctx.arc(f.x + sway + Math.cos(a) * f.s * 0.8, f.y + Math.sin(a) * f.s * 0.8, f.s * 0.62, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = '#fff3b0'
      ctx.beginPath()
      ctx.arc(f.x + sway, f.y, f.s * 0.5, 0, Math.PI * 2)
      ctx.fill()
    }

    // briznas de hierba que ondulan
    for (const b of S.grassSeed) {
      const sway = Math.sin(S.time * 2.2 + b.phase + b.x * 0.01) * 7
      const y0 = h - 2
      const y1 = y0 - b.hgt
      ctx.strokeStyle = b.dark ? '#2c6b33' : `hsl(${b.hue}, 45%, 38%)`
      ctx.lineWidth = 2.4
      ctx.beginPath()
      ctx.moveTo(b.x, y0)
      ctx.quadraticCurveTo(b.x + sway * 0.4, y0 - b.hgt * 0.6, b.x + sway, y1)
      ctx.stroke()
    }
  }

  function drawVignette() {
    const { w, h } = S
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(1, 'rgba(10,10,25,0.32)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  }

  function applyWarmLight(day) {
    if (day.lightAmt < 0.02) return
    ctx.save()
    ctx.globalCompositeOperation = 'overlay'
    ctx.globalAlpha = Math.min(0.5, day.lightAmt)
    ctx.fillStyle = rgb(day.light)
    ctx.fillRect(0, 0, S.w, S.h)
    ctx.restore()
  }

  // ---------- aves decorativas y ambiente ----------
  function updateAmbient(dt) {
    for (const c of S.clouds) {
      c.x += c.v * dt
      if (c.x - 120 * c.s > S.w) { c.x = -120 * c.s; c.y = rand(S.h * 0.04, S.h * 0.42) }
    }
    for (const d of S.distant) {
      d.x += d.v * dt
      d.phase += d.fs * dt
      d.y += Math.sin(d.phase * 0.5) * 8 * dt
      if (d.v > 0 && d.x > S.w + 40) { d.x = -40; d.y = rand(S.h * 0.1, S.h * 0.4) }
      if (d.v < 0 && d.x < -40) { d.x = S.w + 40; d.y = rand(S.h * 0.1, S.h * 0.4) }
    }
    for (const p of S.pollen) {
      p.phase += dt * 1.5
      p.x += (p.vx + Math.sin(p.phase) * 8) * dt
      p.y += (p.vy + Math.cos(p.phase * 0.7) * 6) * dt
      if (p.x < 0) p.x = S.w
      if (p.x > S.w) p.x = 0
      if (p.y < 0) p.y = S.h
      if (p.y > S.h) p.y = 0
    }
    // hojas ocasionales
    S.leafT -= dt
    if (S.leafT <= 0 && S.leaves.length < 10) {
      S.leafT = rand(1.5, 5)
      S.leaves.push({
        x: rand(0, S.w), y: -10, vy: rand(40, 90), vx: rand(-30, 30),
        rot: rand(0, 6.28), vr: rand(-4, 4), phase: rand(0, 6.28),
        c: ['#c98a3d', '#a8642f', '#d9a94e'][(Math.random() * 3) | 0],
      })
    }
    for (let i = S.leaves.length - 1; i >= 0; i--) {
      const l = S.leaves[i]
      l.phase += dt * 3
      l.x += (l.vx + Math.sin(l.phase) * 40) * dt
      l.y += l.vy * dt
      l.rot += l.vr * dt
      if (l.y > S.h + 20) S.leaves.splice(i, 1)
    }
    // aleteo ambiental esporádico
    S.flutterT -= dt
    if (S.flutterT <= 0) {
      S.flutterT = rand(4, 11)
      if (S.mode === 'playing' || S.mode === 'attract') audio.flutter()
    }
  }

  function drawAmbient(day) {
    for (const d of S.distant) {
      drawDistantBird(ctx, d.x, d.y, d.size, d.phase, d.a)
    }
    // polen
    ctx.save()
    ctx.fillStyle = rgb(day.light, 0.5)
    for (const p of S.pollen) {
      ctx.globalAlpha = 0.28 + Math.sin(p.phase) * 0.12
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
    // hojas
    for (const l of S.leaves) {
      ctx.save()
      ctx.translate(l.x, l.y)
      ctx.rotate(l.rot)
      ctx.fillStyle = l.c
      ctx.beginPath()
      ctx.ellipse(0, 0, 7, 3.6, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  // ---------- lógica de partida ----------
  function currentWave() {
    for (let i = 0; i < WAVES.length; i++) {
      if (S.gameT < WAVES[i].until) return { ...WAVES[i], idx: i }
    }
    return { ...WAVES[WAVES.length - 1], idx: WAVES.length - 1 }
  }

  function maybeSpawn(dt) {
    const d = difficulty()
    const wave = currentWave()
    S.waveIdx = wave.idx
    S.spawnT -= dt
    const aliveCount = S.birds.filter((b) => b.alive && !b.dead).length
    if (S.spawnT <= 0 && aliveCount < 14) {
      S.spawnT = (wave.spawnInterval / d.spawnMul) * rand(0.75, 1.25)
      // garantizar al menos un ave dorada por partida
      let force = null
      if (!S.goldenSpawned && S.gameT > 40 && Math.random() < 0.3) {
        force = 'dorada'
        S.goldenSpawned = true
      }
      S.birds.push(spawnBird(S.w, S.h, { speedMul: wave.speedMul * d.speedMul, forceSpecies: force }))
      if (force) S.goldenSpawned = true
    }
  }

  function updateBirds(dt) {
    for (let i = S.birds.length - 1; i >= 0; i--) {
      const b = S.birds[i]
      if (!updateBird(b, dt, S.w, S.h)) S.birds.splice(i, 1)
    }
  }

  function comboMult() {
    return Math.min(GAME.comboMax, 1 + Math.floor(S.streak / GAME.comboHits))
  }

  function handleShot(x, y) {
    if (S.mode !== 'playing' || S.cooldown > 0) return
    S.cooldown = GAME.fireCooldown
    S.kick = 1
    audio.unlock()
    audio.shot()
    effects.shot(x, y)
    if (getSettings().shake) {
      S.shakeT = 0.12
      S.shakeMag = 3
    }
    S.shots++

    // colisión: distancia euclídea al centro < radioImpacto; gana la más cercana
    const tol = tolerance()
    let best = null
    let bestD = Infinity
    for (const b of S.birds) {
      if (!b.alive || b.dead) continue
      const dx = b.x - x
      const dy = b.y - y
      const dist = Math.hypot(dx, dy)
      if (dist <= impactRadius(b, tol) && dist < bestD) {
        best = b
        bestD = dist
      }
    }

    if (best) {
      const d = difficulty()
      const sp = best.species
      const wasGolden = sp.id === 'dorada'
      killBird(best)
      S.hits++
      S.birdsDown++
      S.streak++
      S.bestStreak = Math.max(S.bestStreak, S.streak)
      const newCombo = comboMult()
      const leveled = newCombo > S.combo
      S.combo = newCombo

      let pts = Math.round(sp.points * d.scoreMul * S.combo)
      let label = `+${pts}`
      if (wasGolden) {
        audio.golden()
        effects.goldenExplosion(best.x, best.y)
        if (Math.random() < 0.5) {
          S.timeLeft = Math.min(S.timeLeft + GAME.goldenTimeBonus, GAME.duration + 30)
          label = `¡+${GAME.goldenTimeBonus}s TIEMPO!`
          effects.popup(best.x, best.y - 20, label, '#7df9ff', 26)
        } else {
          pts = Math.round(sp.points * GAME.goldenScoreMul * d.scoreMul * S.combo)
          label = `¡x5 ${pts}!`
          effects.popup(best.x, best.y - 20, label, '#ffd94d', 30)
        }
      } else {
        audio.hit(sp.id === 'halcon')
        effects.hitBurst(best.x, best.y, Object.values(sp.colors), sp.id === 'pato')
        effects.popup(best.x, best.y - 20, label, S.combo > 1 ? '#ffb14d' : '#ffe08a', S.combo > 1 ? 26 : 22)
      }
      const cols = Object.values(sp.colors)
      effects.feathers(best.x, best.y, cols, sp.id === 'pato' ? 14 : 10)

      S.score += pts
      if (leveled) {
        audio.combo(S.combo)
        effects.comboText(S.w / 2, S.h * 0.3, `¡COMBO x${S.combo}!`)
      }
      if (getSettings().shake) {
        S.shakeT = 0.22
        S.shakeMag = wasGolden ? 9 : 6
      }
      // objetivo de sesión
      if (!S.objectiveDone && S.birdsDown >= OBJECTIVE) {
        S.objectiveDone = true
        const bonus = 500
        S.score += bonus
        effects.popup(S.w / 2, S.h * 0.42, `¡OBJETIVO! +${bonus}`, '#8dff7a', 30)
        audio.combo(4)
      }
    } else {
      audio.miss()
      if (S.streak >= GAME.comboHits) {
        effects.popup(x, y - 24, 'Racha rota', '#ff7a7a', 20)
      }
      S.streak = 0
      S.combo = 1
    }
    pushHUD(true)
  }

  function updateGame(dt) {
    S.gameT += dt
    S.timeLeft -= dt
    S.cooldown = Math.max(0, S.cooldown - dt)
    if (S.timeLeft <= 0) {
      S.timeLeft = 0
      endGame()
      return
    }
    maybeSpawn(dt)
    updateBirds(dt)
  }

  function updateCountdown(dt) {
    const prev = S.countdownN
    S.countdownT -= dt
    S.countdownN = Math.ceil(S.countdownT)
    if (S.countdownN !== prev && S.countdownN > 0) {
      audio.unlock()
      audio.countdownTick(false)
    }
    updateBirds(dt)
    if (S.countdownT <= 0) {
      S.mode = 'playing'
      audio.countdownTick(true)
      pushHUD(true)
    }
  }

  function endGame() {
    S.mode = 'over'
    audio.stopMusic()
    const acc = S.shots > 0 ? S.hits / S.shots : 0
    audio.gameOver(S.score > 0)
    const stats = {
      score: S.score,
      shots: S.shots,
      hits: S.hits,
      accuracy: acc,
      bestStreak: S.bestStreak,
      birdsDown: S.birdsDown,
      difficultyId: getSettings().difficultyId,
      useSlider: getSettings().useSlider,
      sliderTolerance: getSettings().sliderTolerance,
    }
    // pequeña pausa dramática antes de mostrar el panel
    clearTimeout(S.overTimer)
    S.overTimer = setTimeout(() => { if (S.mode === 'over') onGameOver(stats) }, 900)
  }

  // ---------- HUD ----------
  function hudState() {
    return {
      mode: S.mode,
      score: S.score,
      timeLeft: Math.ceil(S.timeLeft),
      combo: S.combo,
      streak: S.streak,
      birdsDown: S.birdsDown,
      shots: S.shots,
      accuracy: S.shots > 0 ? S.hits / S.shots : 0,
      wave: currentWave().label,
      waveIdx: S.waveIdx,
      countdown: S.countdownN,
      objective: OBJECTIVE,
      objectiveDone: S.objectiveDone,
      tolerance: tolerance(),
    }
  }

  function pushHUD() {
    onHUD(hudState())
  }

  // ---------- render ----------
  function render() {
    const day = sampleDay(S.dayT)
    ctx.save()
    // sacudida de pantalla
    if (S.shakeT > 0) {
      const m = S.shakeMag * (S.shakeT / 0.22)
      ctx.translate(rand(-m, m), rand(-m, m))
    }

    drawSky(day)
    drawMountains(day)
    drawHills(day)
    drawAmbient(day)

    // aves (las muertas debajo de las vivas para el efecto de caída)
    const dead = S.birds.filter((b) => b.dead)
    const alive = S.birds.filter((b) => !b.dead)
    for (const b of dead) drawBird(ctx, b)
    for (const b of alive) drawBird(ctx, b)

    effects.draw(ctx)
    drawForeground(day)
    applyWarmLight(day)
    drawVignette()

    // cuenta atrás
    if (S.mode === 'countdown' && S.countdownN > 0) {
      const n = S.countdownN
      const frac = S.countdownT - Math.floor(S.countdownT)
      const scale = 1 + (1 - frac) * 0.35
      ctx.save()
      ctx.globalAlpha = Math.min(1, frac * 2 + 0.25)
      ctx.textAlign = 'center'
      ctx.font = `900 ${Math.round(120 * scale)}px "Trebuchet MS", Verdana, sans-serif`
      ctx.lineWidth = 10
      ctx.strokeStyle = 'rgba(20,16,8,0.8)'
      ctx.strokeText(String(n), S.w / 2, S.h * 0.45)
      ctx.fillStyle = '#ffe08a'
      ctx.fillText(String(n), S.w / 2, S.h * 0.45)
      ctx.font = `700 28px "Trebuchet MS", Verdana, sans-serif`
      ctx.fillStyle = '#ffffff'
      ctx.fillText('¡Prepara el ratón!', S.w / 2, S.h * 0.45 + 60)
      ctx.restore()
    }

    // crosshair personalizado
    if ((S.mode === 'playing' || S.mode === 'countdown') && S.mouse.inside) {
      drawCrosshair()
    }

    ctx.restore()
  }

  function drawCrosshair() {
    const { x, y } = S.mouse
    const kick = S.kick * 8
    const r = 16 + kick
    ctx.save()
    ctx.strokeStyle = 'rgba(255,80,60,0.95)'
    ctx.lineWidth = 2.5
    ctx.shadowColor = 'rgba(0,0,0,0.6)'
    ctx.shadowBlur = 4
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.stroke()
    // ticks
    ctx.beginPath()
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      ctx.moveTo(x + dx * (r + 2), y + dy * (r + 2))
      ctx.lineTo(x + dx * (r + 9), y + dy * (r + 9))
    }
    ctx.stroke()
    // punto central
    ctx.fillStyle = 'rgba(255,80,60,0.95)'
    ctx.beginPath()
    ctx.arc(x, y, 2.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  // ---------- bucle ----------
  let rafId = 0
  let lastT = 0
  let destroyed = false

  function loop(t) {
    if (destroyed) return
    rafId = requestAnimationFrame(loop)
    const dt = Math.min(0.05, lastT ? (t - lastT) / 1000 : 0.016)
    lastT = t

    // el ciclo de día siempre avanza (fondo vivo), salvo en pausa
    const frozen = S.mode === 'paused'
    if (!frozen) {
      const daySpeed = S.mode === 'attract' ? 1 / 150 : 1 / 210
      S.dayT = (S.dayT + dt * daySpeed) % 1
      S.time += dt
    }
    S.kick = Math.max(0, S.kick - dt * 6)
    if (S.shakeT > 0) S.shakeT -= dt

    if (!frozen) {
      updateAmbient(dt)
      effects.update(dt)
    }

    if (S.mode === 'countdown') updateCountdown(dt)
    else if (S.mode === 'playing') updateGame(dt)
    else if (S.mode === 'attract' || S.mode === 'over') {
      // fondo vivo: aparecen aves ambientales
      if (S.mode === 'attract') {
        S.spawnT -= dt
        if (S.spawnT <= 0 && S.birds.length < 7) {
          S.spawnT = rand(0.8, 2.2)
          S.birds.push(spawnBird(S.w, S.h, { speedMul: 0.8 }))
        }
      }
      updateBirds(dt)
    }
    // 'paused': lógica congelada, solo se renderiza el fotograma

    render()

    // HUD con throttle
    S.hudT -= dt
    if (S.hudT <= 0 && (S.mode === 'playing' || S.mode === 'countdown')) {
      S.hudT = 0.12
      onHUD(hudState())
    }
  }

  // ---------- API pública ----------
  const api = {
    start() {
      resize()
      lastT = 0
      rafId = requestAnimationFrame(loop)
    },

    destroy() {
      destroyed = true
      cancelAnimationFrame(rafId)
      clearTimeout(S.overTimer)
      audio.dispose()
      window.removeEventListener('resize', resize)
    },

    newGame() {
      const st = getSettings()
      effects.clear()
      S.birds = []
      S.mode = 'countdown'
      S.gameT = 0
      S.timeLeft = GAME.duration
      S.countdownT = 3.2
      S.countdownN = 3
      S.score = 0
      S.shots = 0
      S.hits = 0
      S.birdsDown = 0
      S.streak = 0
      S.bestStreak = 0
      S.combo = 1
      S.waveIdx = 0
      S.spawnT = 0.4
      S.cooldown = 0
      S.goldenSpawned = false
      S.objectiveDone = false
      S.shakeT = 0
      audio.unlock()
      audio.setVolumes(st.masterVolume, st.sfxVolume)
      audio.stopMusic()
      audio.startMusic()
      audio.countdownTick(false)
      pushHUD(true)
    },

    toAttract() {
      effects.clear()
      S.birds = []
      S.mode = 'attract'
      S.spawnT = 0.2
      audio.stopMusic()
      pushHUD(true)
    },

    pause() {
      if (S.mode !== 'playing' && S.mode !== 'countdown') return
      S.pausedFrom = S.mode
      S.mode = 'paused'
      audio.stopMusic()
      pushHUD(true)
    },

    resume() {
      if (S.mode !== 'paused') return
      S.mode = S.pausedFrom === 'countdown' ? 'countdown' : 'playing'
      S.pausedFrom = null
      audio.unlock()
      const st = getSettings()
      audio.setVolumes(st.masterVolume, st.sfxVolume)
      audio.startMusic()
      lastT = 0
      pushHUD(true)
    },

    applySettings() {
      const st = getSettings()
      audio.setVolumes(st.masterVolume, st.sfxVolume)
      const q = st.quality
      const hiQ = q === 'alta'
      // recrear efectos si cambia la densidad (barato)
      effects = createEffects(q)
      resize() // reconstruye escenario y DPR
    },

    click(x, y) { handleShot(x, y) },

    setMouse(x, y, inside) {
      S.mouse.x = x
      S.mouse.y = y
      S.mouse.inside = inside
    },

    getMode() { return S.mode },
    getAudio() { return audio },

    // Hook de depuración/test (sin secretos; solo estado de la partida)
    debugSnapshot() {
      return {
        mode: S.mode,
        score: S.score,
        timeLeft: S.timeLeft,
        birds: S.birds.map((b) => ({
          x: Math.round(b.x), y: Math.round(b.y),
          radius: b.radius, dead: b.dead, species: b.species.id,
        })),
      }
    },
    debugSetTimeLeft(s) { S.timeLeft = s },
  }

  window.addEventListener('resize', resize)
  return api
}
