# Caza en el Cielo

Juego arcade de punteria para navegador. Derriba tantas aves como puedas durante partidas de 90 segundos, encadena aciertos para aumentar el combo y encuentra aves doradas para conseguir mas puntos y tiempo extra.

## Caracteristicas

- Partidas rapidas de 90 segundos con dificultad progresiva por oleadas.
- Cuatro niveles de dificultad y tolerancia de disparo personalizable.
- Sistema de puntuacion, combos, precision, objetivos y records.
- Aves doradas con bonificaciones especiales.
- Sonido y musica generados en tiempo real con Web Audio API, sin archivos externos.
- Calidad grafica, volumen y sacudida de pantalla configurables.
- Ajustes y records guardados en el navegador mediante `localStorage`.
- Interfaz construida con React y motor de juego sobre Canvas.

## Controles

- **Clic izquierdo:** disparar.
- **Esc:** pausar o reanudar la partida.
- **Botones en pantalla:** jugar, ajustar opciones, consultar records y gestionar la pausa.

## Requisitos

- Node.js 18 o posterior.
- npm.

## Instalacion y uso

```bash
npm install
npm run dev
```

Abre la direccion que muestra Vite, normalmente `http://localhost:5173`.

## Comandos disponibles

```bash
# Iniciar el servidor de desarrollo
npm run dev

# Crear una version optimizada para produccion
npm run build

# Previsualizar la version de produccion
npm run preview
```

## Estructura del proyecto

```text
src/
|-- components/    # Menus, HUD, ajustes y lienzo del juego
|-- game/          # Motor, configuracion, aves, audio y efectos
|-- App.jsx        # Flujo principal de pantallas y estado
|-- main.jsx       # Punto de entrada de React
`-- styles.css     # Estilos de la interfaz
```

## Tecnologias

- React 18
- Vite 6
- Canvas 2D
- Web Audio API
- Playwright (prueba de humo)

## Compilacion para produccion

```bash
npm run build
```

Los archivos generados quedan en `dist/`.
