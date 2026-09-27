// Test de humo de "Caza en el Cielo" (Playwright, Chromium headless local).
// El renderizado por software es lento; se espera por CONDICIONES, no por tiempos fijos.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const SHOTS = new URL('./shots/', import.meta.url);
fs.mkdirSync(SHOTS, { recursive: true });
const shot = (name) => fileURLToPath(new URL(name, SHOTS));

const errors = [];
const browser = await chromium.launch({
  executablePath: process.env.HOME + '/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--disable-dev-shm-usage', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('[console] ' + m.text().slice(0, 300));
});

const results = [];
async function waitFor(fn, timeout = 30000) {
  const t0 = Date.now();
  for (;;) {
    try { if (await fn()) return true; } catch {}
    if (Date.now() - t0 > timeout) return false;
    await page.waitForTimeout(250);
  }
}
async function step(name, fn) {
  try {
    const ok = !!(await fn());
    results.push((ok ? '✓ ' : '✗ ') + name);
    return ok;
  } catch (e) {
    results.push(`✗ ${name} (excepción: ${String(e.message || e).split('\n')[0]})`);
    return false;
  }
}
const snap = () => page.evaluate(() => window.__caza ? window.__caza.debugSnapshot() : null);
const mode = async () => (await snap())?.mode;

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

await step('menú principal visible', async () => {
  await page.getByRole('button', { name: /Jugar/ }).waitFor({ timeout: 15000 });
  return true;
});
await page.waitForTimeout(1500);
await page.screenshot({ path: shot('menu.png') });

await step('ajustes: cambiar dificultad persiste en localStorage', async () => {
  await page.getByRole('button', { name: /Ajustes/ }).click();
  await page.getByRole('button', { name: /Leyenda/ }).click();
  await page.getByRole('button', { name: /^Listo$/ }).click();
  const raw = await page.evaluate(() => localStorage.getItem('caza-en-el-cielo-settings-v1'));
  const st = JSON.parse(raw);
  return st.difficultyId === 'leyenda' && st.useSlider === false;
});

await step('inicia la partida y termina la cuenta atrás', async () => {
  await page.getByRole('button', { name: /Jugar/ }).click();
  await page.locator('.hud').waitFor({ timeout: 10000 });
  return await waitFor(async () => (await mode()) === 'playing', 20000);
});

// Volver a dificultad Cazador para que el test de disparo sea estable
await page.evaluate(() => {
  const raw = localStorage.getItem('caza-en-el-cielo-settings-v1');
  const st = JSON.parse(raw);
  st.difficultyId = 'cazador';
  localStorage.setItem('caza-en-el-cielo-settings-v1', JSON.stringify(st));
});

await step('disparo a un ave suma puntos', async () => {
  const hasBird = await waitFor(async () => {
    const s = await snap();
    return s && s.birds.some((b) => !b.dead && b.x > 0 && b.x < 1100);
  }, 20000);
  if (!hasBird) return false;
  for (let i = 0; i < 6; i++) {
    const s = await snap();
    const b = s.birds.find((bb) => !bb.dead && bb.x > 20 && bb.x < 1080);
    if (!b) { await page.waitForTimeout(400); continue; }
    await page.mouse.click(b.x, b.y);
    await page.waitForTimeout(350); // respetar cadencia
    const s2 = await snap();
    if (s2.score > 0) return true;
  }
  return false;
});
await page.screenshot({ path: shot('gameplay.png') });

await step('fallo intencionado no suma puntos (disparo a la hierba)', async () => {
  const before = (await snap()).score;
  await page.mouse.click(30, 690); // esquina inferior: primer plano, sin aves
  await page.waitForTimeout(400);
  const after = (await snap()).score;
  return after === before;
});

await step('Esc pausa y Reanudar continúa', async () => {
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Reanudar/ }).waitFor({ timeout: 5000 });
  const pausedMode = await mode();
  await page.getByRole('button', { name: /Reanudar/ }).click();
  await page.waitForTimeout(600);
  const resumed = await mode();
  return pausedMode === 'paused' && resumed === 'playing';
});

await step('fin de partida muestra panel y guarda récord', async () => {
  await page.evaluate(() => window.__caza.debugSetTimeLeft(1.5));
  await page.getByText('FIN DE LA PARTIDA').waitFor({ timeout: 15000 });
  const raw = await page.evaluate(() => localStorage.getItem('caza-en-el-cielo-records-v1'));
  const rec = JSON.parse(raw);
  return rec.best > 0 && rec.games >= 1;
});
await page.screenshot({ path: shot('gameover.png') });

await step('Reintentar arranca una partida nueva', async () => {
  await page.getByRole('button', { name: /Reintentar/ }).click();
  return await waitFor(async () => {
    const m = await mode();
    return m === 'countdown' || m === 'playing';
  }, 10000);
});

await step('cero errores en consola', async () => errors.length === 0);

await browser.close();

console.log(results.join('\n'));
if (errors.length) {
  console.log('--- errores ---');
  console.log(errors.join('\n'));
}
const failed = results.filter((r) => r.startsWith('✗')).length;
console.log(failed === 0 ? '\nTODOS LOS CHECKS OK' : `\n${failed} CHECKS FALLIDOS`);
process.exit(failed === 0 && errors.length === 0 ? 0 : 1);
