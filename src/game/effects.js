// ============================================================
// effects.js — partículas, plumas, popups y anillos (object pooling)
// ============================================================

function makePool(factory, size) {
  const items = []
  for (let i = 0; i < size; i++) items.push(factory())
  return { items, cursor: 0 }
}

function next(pool) {
  const p = pool.items[pool.cursor]
  pool.cursor = (pool.cursor + 1) % pool.items.length
  return p
}

export function createEffects(quality = 'alta') {
  const hiQ = quality === 'alta'
  const scale = hiQ ? 1 : 0.45

  const pools = {
    particles: makePool(() => ({
      active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1,
      size: 2, color: '#fff', gravity: 0, drag: 0, alpha: 1, glow: false,
    }), Math.round(320 * scale)),
    feathers: makePool(() => ({
      active: false, x: 0, y: 0, vx: 0, vy: 0, rot: 0, vr: 0,
      life: 0, maxLife: 1, size: 6, color: '#fff', sway: 0, swaySpeed: 0,
    }), Math.round(160 * scale)),
    popups: makePool(() => ({
      active: false, x: 0, y: 0, text: '', life: 0, maxLife: 1,
      color: '#fff', size: 20, vy: 0,
    }), 24),
    rings: makePool(() => ({
      active: false, x: 0, y: 0, r: 4, maxR: 60, life: 0, maxLife: 1,
      color: '#fff', width: 3,
    }), 24),
    flashes: makePool(() => ({
      active: false, x: 0, y: 0, life: 0, maxLife: 1, size: 30, color: '#fff2b0',
    }), 16),
    tracers: makePool(() => ({
      active: false, x: 0, y: 0, life: 0, maxLife: 1, angle: 0, len: 40,
    }), 16),
  }

  const api = {
    setQuality(q) {
      // La calidad se aplica al crear; aquí solo se expone por simetría.
    },

    // ---- emisores ----
    shot(x, y) {
      const f = next(pools.flashes)
      Object.assign(f, { active: true, x, y, life: 0.12, maxLife: 0.12, size: 34, color: '#fff3c4' })
      const ring = next(pools.rings)
      Object.assign(ring, { active: true, x, y, r: 6, maxR: 46, life: 0.28, maxLife: 0.28, color: 'rgba(255,240,190,0.9)', width: 3 })
      // chispas del disparo
      for (let i = 0; i < 6; i++) {
        const p = next(pools.particles)
        const a = Math.random() * Math.PI * 2
        const sp = 120 + Math.random() * 260
        Object.assign(p, {
          active: true, x, y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: 0.25 + Math.random() * 0.2, maxLife: 0.45,
          size: 1.5 + Math.random() * 2.5, color: '#ffd76a',
          gravity: 300, drag: 2.5, alpha: 1, glow: true,
        })
      }
    },

    hitBurst(x, y, colors, big = false) {
      const n = big ? 22 : 12
      for (let i = 0; i < n; i++) {
        const p = next(pools.particles)
        const a = Math.random() * Math.PI * 2
        const sp = 60 + Math.random() * (big ? 420 : 300)
        Object.assign(p, {
          active: true, x, y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80,
          life: 0.4 + Math.random() * 0.4, maxLife: 0.8,
          size: 2 + Math.random() * 3.5,
          color: colors[(Math.random() * colors.length) | 0],
          gravity: 500, drag: 1.8, alpha: 1, glow: false,
        })
      }
      const ring = next(pools.rings)
      Object.assign(ring, {
        active: true, x, y, r: 8, maxR: big ? 110 : 80,
        life: 0.35, maxLife: 0.35, color: 'rgba(255,255,255,0.85)', width: 4,
      })
    },

    feathers(x, y, colors, count = 10) {
      for (let i = 0; i < count; i++) {
        const f = next(pools.feathers)
        const a = Math.random() * Math.PI * 2
        const sp = 40 + Math.random() * 220
        Object.assign(f, {
          active: true, x: x + (Math.random() - 0.5) * 16, y: y + (Math.random() - 0.5) * 16,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120,
          rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 12,
          life: 1.2 + Math.random() * 0.9, maxLife: 2.1,
          size: 5 + Math.random() * 7,
          color: colors[(Math.random() * colors.length) | 0],
          sway: Math.random() * Math.PI * 2, swaySpeed: 4 + Math.random() * 5,
        })
      }
    },

    popup(x, y, text, color = '#ffe08a', size = 22) {
      const p = next(pools.popups)
      Object.assign(p, {
        active: true, x, y: y - 10, text, life: 1.1, maxLife: 1.1,
        color, size, vy: -70,
      })
    },

    comboText(x, y, text) {
      const p = next(pools.popups)
      Object.assign(p, {
        active: true, x, y, text, life: 1.4, maxLife: 1.4,
        color: '#ff9d3c', size: 34, vy: -40,
      })
    },

    goldenExplosion(x, y) {
      for (let i = 0; i < 30; i++) {
        const p = next(pools.particles)
        const a = Math.random() * Math.PI * 2
        const sp = 100 + Math.random() * 480
        Object.assign(p, {
          active: true, x, y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: 0.6 + Math.random() * 0.6, maxLife: 1.2,
          size: 2 + Math.random() * 4, color: i % 3 === 0 ? '#fff7d6' : '#f2b134',
          gravity: 120, drag: 2, alpha: 1, glow: true,
        })
      }
      const ring = next(pools.rings)
      Object.assign(ring, {
        active: true, x, y, r: 10, maxR: 160, life: 0.5, maxLife: 0.5,
        color: 'rgba(255,210,90,0.95)', width: 5,
      })
    },

    // ---- update ----
    update(dt) {
      for (const p of pools.particles.items) {
        if (!p.active) continue
        p.life -= dt
        if (p.life <= 0) { p.active = false; continue }
        p.vy += p.gravity * dt
        const d = 1 - Math.min(0.9, p.drag * dt)
        p.vx *= d; p.vy *= d
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.alpha = Math.max(0, p.life / p.maxLife)
      }
      for (const f of pools.feathers.items) {
        if (!f.active) continue
        f.life -= dt
        if (f.life <= 0) { f.active = false; continue }
        // física de pluma: cae lento, oscila, gira
        f.sway += f.swaySpeed * dt
        f.vy += 260 * dt
        f.vy = Math.min(f.vy, 130) // las plumas planean
        f.vx *= (1 - Math.min(0.9, 1.6 * dt))
        f.vx += Math.sin(f.sway) * 60 * dt
        f.x += f.vx * dt
        f.y += f.vy * dt
        f.rot += f.vr * dt
      }
      for (const p of pools.popups.items) {
        if (!p.active) continue
        p.life -= dt
        if (p.life <= 0) { p.active = false; continue }
        p.y += p.vy * dt
        p.vy *= (1 - Math.min(0.9, 2.2 * dt))
      }
      for (const r of pools.rings.items) {
        if (!r.active) continue
        r.life -= dt
        if (r.life <= 0) { r.active = false; continue }
        const t = 1 - r.life / r.maxLife
        r.r = 6 + (r.maxR - 6) * (1 - Math.pow(1 - t, 3))
      }
      for (const f of pools.flashes.items) {
        if (!f.active) continue
        f.life -= dt
        if (f.life <= 0) f.active = false
      }
    },

    // ---- draw ----
    draw(ctx) {
      // flashes (fogonazo)
      for (const f of pools.flashes.items) {
        if (!f.active) continue
        const t = f.life / f.maxLife
        ctx.save()
        ctx.globalAlpha = t
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size)
        g.addColorStop(0, '#ffffff')
        g.addColorStop(0.35, f.color)
        g.addColorStop(1, 'rgba(255,180,60,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(f.x, f.y, f.size * (1.4 - t * 0.4), 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
      // anillos expansivos
      for (const r of pools.rings.items) {
        if (!r.active) continue
        const t = r.life / r.maxLife
        ctx.save()
        ctx.globalAlpha = t
        ctx.strokeStyle = r.color
        ctx.lineWidth = r.width * t + 0.5
        ctx.beginPath()
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }
      // partículas
      for (const p of pools.particles.items) {
        if (!p.active) continue
        ctx.save()
        ctx.globalAlpha = p.alpha
        if (p.glow) {
          ctx.shadowColor = p.color
          ctx.shadowBlur = 8
        }
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
      // plumas (elipse rotada con nervadura)
      for (const f of pools.feathers.items) {
        if (!f.active) continue
        const a = Math.min(1, f.life / (f.maxLife * 0.5))
        ctx.save()
        ctx.globalAlpha = a
        ctx.translate(f.x, f.y)
        ctx.rotate(f.rot)
        ctx.fillStyle = f.color
        ctx.beginPath()
        ctx.ellipse(0, 0, f.size, f.size * 0.42, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(-f.size, 0)
        ctx.lineTo(f.size, 0)
        ctx.stroke()
        ctx.restore()
      }
      // popups de texto
      ctx.save()
      ctx.textAlign = 'center'
      for (const p of pools.popups.items) {
        if (!p.active) continue
        const t = p.life / p.maxLife
        const pop = t > 0.82 ? 1 + (t - 0.82) * 3.2 : 1 // escala de aparición
        ctx.globalAlpha = Math.min(1, t * 2.2)
        ctx.font = `800 ${Math.round(p.size * pop)}px "Trebuchet MS", Verdana, sans-serif`
        ctx.lineWidth = 4
        ctx.strokeStyle = 'rgba(20,16,8,0.75)'
        ctx.strokeText(p.text, p.x, p.y)
        ctx.fillStyle = p.color
        ctx.fillText(p.text, p.x, p.y)
      }
      ctx.restore()
    },

    clear() {
      for (const key of Object.keys(pools)) {
        for (const it of pools[key].items) it.active = false
      }
    },
  }

  return api
}
