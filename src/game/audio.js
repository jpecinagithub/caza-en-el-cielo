// ============================================================
// audio.js — motor de sonido 100% sintetizado con WebAudio API
// Sin archivos externos. El contexto se crea con el primer gesto.
// ============================================================

export function createAudioEngine() {
  let ctx = null
  let masterGain = null
  let sfxGain = null
  let musicGain = null
  let noiseBuffer = null
  let musicTimer = null
  let musicStep = 0
  let volumes = { master: 0.8, sfx: 0.8 }

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      return true
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return false
      ctx = new AC()
      masterGain = ctx.createGain()
      masterGain.connect(ctx.destination)
      sfxGain = ctx.createGain()
      sfxGain.connect(masterGain)
      musicGain = ctx.createGain()
      musicGain.connect(masterGain)
      applyVolumes()
      // buffer de ruido reutilizable
      const len = ctx.sampleRate * 1
      noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate)
      const data = noiseBuffer.getChannelData(0)
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
      return true
    } catch {
      return false
    }
  }

  function applyVolumes() {
    if (!ctx) return
    const t = ctx.currentTime
    masterGain.gain.setTargetAtTime(volumes.master, t, 0.02)
    sfxGain.gain.setTargetAtTime(volumes.sfx, t, 0.02)
    musicGain.gain.setTargetAtTime(volumes.master * 0.35, t, 0.05)
  }

  function noiseBurst({ dur = 0.2, freq = 2000, q = 1, gain = 0.5, type = 'bandpass', when = 0 }) {
    if (!ensure()) return
    const t0 = ctx.currentTime + when
    const src = ctx.createBufferSource()
    src.buffer = noiseBuffer
    src.loop = true
    const f = ctx.createBiquadFilter()
    f.type = type
    f.frequency.value = freq
    f.Q.value = q
    const g = ctx.createGain()
    g.gain.setValueAtTime(gain, t0)
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur)
    src.connect(f); f.connect(g); g.connect(sfxGain)
    src.start(t0)
    src.stop(t0 + dur + 0.05)
  }

  function tone({ freq = 440, freqEnd = null, dur = 0.2, gain = 0.4, type = 'sine', when = 0, dest = null }) {
    if (!ensure()) return
    const t0 = ctx.currentTime + when
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(freq, t0)
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012)
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur)
    o.connect(g); g.connect(dest || sfxGain)
    o.start(t0)
    o.stop(t0 + dur + 0.05)
  }

  // Escala pentatónica para la música generativa
  const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21]
  const BASE = 220 // La3

  function scheduleMusicStep() {
    if (!ctx) return
    const step = musicStep++
    const bar = Math.floor(step / 8) % 4
    // Pad: acorde cada 8 pasos (raíz cambia por compás)
    if (step % 8 === 0) {
      const roots = [0, -4, -7, -2]
      const root = BASE * Math.pow(2, roots[bar] / 12)
      ;[0, 4, 7].forEach((iv) => {
        const f = root * Math.pow(2, iv / 12)
        tone({
          freq: f, dur: 3.4, gain: 0.05, type: 'triangle',
          when: 0, dest: musicGain,
        })
      })
    }
    // Pluck melódico esporádico
    if (Math.random() < 0.42) {
      const n = PENTA[(Math.random() * PENTA.length) | 0]
      const f = BASE * 2 * Math.pow(2, n / 12)
      tone({ freq: f, dur: 0.9, gain: 0.06, type: 'sine', when: Math.random() * 0.15, dest: musicGain })
      tone({ freq: f * 2, dur: 0.5, gain: 0.02, type: 'sine', when: Math.random() * 0.15, dest: musicGain })
    }
  }

  return {
    // Debe llamarse desde un gesto de usuario (clic/tap)
    unlock() { ensure() },

    setVolumes(master, sfx) {
      volumes.master = Math.max(0, Math.min(1, master))
      volumes.sfx = Math.max(0, Math.min(1, sfx))
      applyVolumes()
    },

    // --- efectos ---
    shot() {
      noiseBurst({ dur: 0.14, freq: 900, q: 0.8, gain: 0.55, type: 'lowpass' })
      tone({ freq: 220, freqEnd: 60, dur: 0.16, gain: 0.5, type: 'square' })
      noiseBurst({ dur: 0.06, freq: 4500, q: 1.2, gain: 0.22 })
    },

    hit(big = false) {
      tone({ freq: 340, freqEnd: 120, dur: 0.18, gain: 0.5, type: 'triangle' })
      // "gorjeo" ascendente del impacto
      tone({ freq: 700, freqEnd: 1500, dur: 0.12, gain: 0.22, type: 'sine', when: 0.03 })
      noiseBurst({ dur: 0.12, freq: 2600, q: 1, gain: 0.3 })
      if (big) {
        tone({ freq: 520, freqEnd: 2000, dur: 0.25, gain: 0.3, type: 'sine', when: 0.08 })
      }
    },

    miss() {
      noiseBurst({ dur: 0.22, freq: 1400, q: 2.5, gain: 0.16, type: 'bandpass' })
      tone({ freq: 300, freqEnd: 180, dur: 0.18, gain: 0.1, type: 'sine' })
    },

    flutter() {
      // aleteo ambiental suave
      for (let i = 0; i < 3; i++) {
        noiseBurst({ dur: 0.07, freq: 700, q: 1.5, gain: 0.05, when: i * 0.09 })
      }
    },

    combo(level) {
      // fanfarria: arpegio ascendente, más notas a mayor combo
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]
      const n = Math.min(notes.length, 2 + level)
      for (let i = 0; i < n; i++) {
        tone({ freq: notes[i], dur: 0.22, gain: 0.28, type: 'triangle', when: i * 0.07 })
      }
      tone({ freq: 261.6, dur: 0.4, gain: 0.2, type: 'sine', when: 0 })
    },

    countdownTick(final = false) {
      tone({ freq: final ? 880 : 440, dur: final ? 0.4 : 0.15, gain: 0.35, type: 'square' })
    },

    golden() {
      const seq = [1046.5, 1318.5, 1568, 2093, 1568, 2093]
      seq.forEach((f, i) => tone({ freq: f, dur: 0.3, gain: 0.25, type: 'sine', when: i * 0.09 }))
      noiseBurst({ dur: 0.5, freq: 6000, q: 0.7, gain: 0.12, type: 'highpass' })
    },

    gameOver(win) {
      const seq = win
        ? [523.25, 659.25, 783.99, 1046.5]
        : [392, 329.63, 261.63, 196]
      seq.forEach((f, i) => tone({ freq: f, dur: 0.35, gain: 0.3, type: 'triangle', when: i * 0.16 }))
    },

    // --- música ambiental generativa ---
    startMusic() {
      if (!ensure() || musicTimer) return
      musicTimer = setInterval(scheduleMusicStep, 450)
    },

    stopMusic() {
      if (musicTimer) {
        clearInterval(musicTimer)
        musicTimer = null
      }
    },

    dispose() {
      this.stopMusic()
      if (ctx) {
        ctx.close().catch(() => {})
        ctx = null
        masterGain = sfxGain = musicGain = noiseBuffer = null
      }
    },
  }
}
