# Caza en el Cielo 🏹

Juego arcade de caza de aves para navegador, creado con **React + Vite + Canvas**. Sin assets externos: todo el gráfico es procedural y el sonido está 100% sintetizado con WebAudio API.

## Cómo jugar

```bash
npm install
npm run dev
```

Abre http://localhost:5173 — solo necesitas el ratón: clic para disparar, Esc para pausar.

## Características

- 5 especies de aves dibujadas proceduralmente (gorrión, paloma, pato, halcón y ave dorada bonus), cada una con su velocidad, tamaño, patrón de vuelo y puntuación.
- "Entorno razonable" configurable: el radio de impacto de cada disparo se ajusta con 4 niveles de dificultad o un deslizador personalizado (×0.5 – ×2.0).
- Partidas de 90 segundos con oleadas de dificultad creciente, rachas de combo con multiplicador y objetivo de 30 aves.
- Nombre del cazador y ranking top 10 guardado en el navegador (localStorage).
- Fondo parallax de 4 capas con ciclo de día (amanecer → mediodía → atardecer), partículas ambientales y efectos con física.
- Ajustes en vivo: volúmenes, calidad gráfica y sacudida de pantalla, sin recargar.

## Estructura

```
src/
  App.jsx                  — pantallas (menú / juego / fin)
  components/              — GameCanvas, HUD, MainMenu, Settings, HunterName, GameOver
  game/
    engine.js              — bucle, colisiones, escenario y oleadas
    birds.js               — especies, spawn, patrones de vuelo y dibujo
    effects.js             — partículas, plumas y popups (object pooling)
    audio.js               — motor WebAudio 100% sintetizado
    config.js              — dificultad, balance y persistencia
  styles.css
test/
  smoke.mjs                — test funcional con Playwright
```
