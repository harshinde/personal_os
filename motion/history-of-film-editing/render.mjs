#!/usr/bin/env node
// Renders scene.js frame-by-frame in headless Chrome and pipes lossless PNGs into ffmpeg (H.264).
//   node render.mjs [--fps 60] [--out out/history-of-film-editing.mp4] [--workers 3] [--stills 2.3,7,12.4,17]
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);
const FPS = Number(args.fps ?? 60);
const OUT = resolve(args.out ?? resolve(here, 'out/history-of-film-editing.mp4'));
const WORKERS = Number(args.workers ?? 3);
const STILLS = args.stills ? args.stills.split(',').map(Number) : null;
const CHROME = process.env.CHROME_PATH
  ?? ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync);

// One browser per worker: headless Chrome does not paint background tabs, so tabs sharing a
// browser stall on screenshot.
const browsers = [];
async function openPage() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu-vsync', '--force-color-profile=srgb', '--hide-scrollbars'],
  });
  browsers.push(browser);
  const [page] = await browser.pages();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(resolve(here, 'index.html')).href + '?render=1');
  await page.evaluate(() => window.READY);
  return page;
}
async function grab(page, t) {
  await page.evaluate((tt) => window.renderFrame(tt), t);
  return page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1920, height: 1080 }, optimizeForSpeed: true });
}

mkdirSync(dirname(OUT), { recursive: true });

if (STILLS) {
  const page = await openPage();
  for (const [i, t] of STILLS.entries()) {
    const file = OUT.replace(/\.mp4$/, '') + `-t${t}.png`;
    writeFileSync(file, await grab(page, t));
    console.log('still', i + 1, t, file);
  }
  await Promise.all(browsers.map((b) => b.close()));
  process.exit(0);
}

const DUR = 20;
const N = Math.round(DUR * FPS);
const ff = spawn('ffmpeg', [
  '-y', '-loglevel', 'error',
  '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-tune', 'animation',
  '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
  '-r', String(FPS), '-frames:v', String(N), '-movflags', '+faststart', OUT,
], { stdio: ['pipe', 'inherit', 'inherit'] });
const ffDone = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg exit ' + c)))));

const pages = await Promise.all(Array.from({ length: WORKERS }, openPage));
const buffers = new Map();
let nextWrite = 0, nextFrame = 0;
const t0 = Date.now();

async function flush() {
  while (buffers.has(nextWrite)) {
    const buf = buffers.get(nextWrite);
    buffers.delete(nextWrite);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    nextWrite++;
    if (nextWrite % FPS === 0) {
      const el = (Date.now() - t0) / 1000;
      process.stdout.write(`\r${nextWrite}/${N} frames  ${(nextWrite / el).toFixed(1)} fps  `);
    }
  }
}
let flushing = Promise.resolve();
await Promise.all(pages.map(async (page) => {
  while (true) {
    const i = nextFrame++;
    if (i >= N) break;
    while (i - nextWrite > WORKERS * 8) await new Promise((r) => setTimeout(r, 5));
    buffers.set(i, await grab(page, i / FPS));
    flushing = flushing.then(flush);
  }
}));
await flushing;
ff.stdin.end();
await ffDone;
await Promise.all(browsers.map((b) => b.close()));
console.log(`\nwrote ${OUT} (${N} frames @ ${FPS} fps) in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
