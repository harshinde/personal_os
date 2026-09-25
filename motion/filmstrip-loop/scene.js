// Filmstrip loop — a deterministic, pure function of time: drawFrame(ctx, t) for t in [0, 20).
// Every periodic motion uses a whole number of cycles per 20 s so frame N and frame 0 line up.
(function () {
  'use strict';

  const W = 1920, H = 1080, DUR = 20;
  const TAU = Math.PI * 2;

  // ---------- math ----------
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  const easeOutBack = (x, s = 1.7) => { x = clamp(x); const c = s + 1; return 1 + c * (x - 1) ** 3 + s * (x - 1) ** 2; };
  const easeInBack = (x, s = 1.7) => { x = clamp(x); return (s + 1) * x ** 3 - s * x ** 2; };
  const easeOutCubic = (x) => 1 - (1 - clamp(x)) ** 3;
  const wrap = (x, m) => ((x % m) + m) % m;
  const wrapS = (x, m = DUR) => wrap(x + m / 2, m) - m / 2;
  const pulse = (x, a, b) => smooth((x - a[0]) / (a[1] - a[0])) * (1 - smooth((x - b[0]) / (b[1] - b[0])));
  function hash(n) { let x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- color ----------
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const shade = (c, k) => mix(c, k > 0 ? [255, 255, 255] : [0, 0, 0], Math.abs(k));

  const INK = '#211a16';
  const INKc = hex(INK);
  const CREAM = '#f7ecd3';
  const CREAMc = hex(CREAM);
  const ORANGE = '#ef7b2d', ORANGE_D = '#c95b1c', ORANGE_L = '#f8a15a', HOLE = '#7e3312';
  const BRASS = '#d7a843', BRASS_D = '#94691f', BRASS_L = '#f1d27a';
  const SHOE = '#a3302a', GLOVE = '#fdf8ec';
  const FONT_SCRIPT = '"Pacifico", cursive';
  const FONT_SLAB = '"Alfa Slab One", serif';
  const FONT_MONO = '"JetBrains Mono", "DejaVu Sans Mono", monospace';

  const ERAS = [
    { label: '1920s', sub: 'THE SILENT CUT', paper: hex('#e2a83b'), ray: hex('#d99c2e'), deco: hex('#f4cd6c'), text: INKc },
    { label: '1960s', sub: 'THE JUMP CUT', paper: hex('#4b70a2'), ray: hex('#43679a'), deco: hex('#7fa1cc'), text: CREAMc },
    { label: '1990s', sub: 'THE DIGITAL DESK', paper: hex('#9dd3be'), ray: hex('#8fc8b1'), deco: hex('#c9ecdd'), text: INKc },
    { label: 'TODAY', sub: 'THE FINALE', paper: hex('#1d2747'), ray: hex('#243056'), deco: hex('#3a477c'), text: CREAMc },
  ];
  const HW = 0.6; // half-width of the era cross-fade, seconds

  // local time inside era k, in [-7.5, 12.5): era k "owns" [0, 5)
  const eraLocal = (t, k) => wrapS(t - 5 * k - 2.5) + 2.5;
  function eraWeights(t) {
    const w = [];
    for (let k = 0; k < 4; k++) {
      const u = eraLocal(t, k);
      w.push(smooth((u + HW) / (2 * HW)) * (1 - smooth((u - 5 + HW) / (2 * HW))));
    }
    return w;
  }
  const blendC = (w, key) => {
    let c = [0, 0, 0];
    for (let k = 0; k < 4; k++) c = [c[0] + ERAS[k][key][0] * w[k], c[1] + ERAS[k][key][1] * w[k], c[2] + ERAS[k][key][2] * w[k]];
    return c;
  };

  // ---------- layout ----------
  const STRIP_Y = 622, STRIP_H = 280, PITCH = 240, V = 240, L = V * DUR; // strip scrolls 4800 px per loop
  const XM = 720; // mascot x; a multiple of PITCH so era boundaries land on frame lines
  const GROUND = STRIP_Y + 20;
  const R = 118, LEG = 92, ARM = 178;
  const stripX = (s, t) => wrap(s + V * t + 300, L) - 300; // screen x of strip coordinate s
  const stripTau = (s) => wrap((XM - s) / V, DUR); // time at which strip coordinate s passes the mascot

  // ---------- helpers ----------
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function star4(ctx, x, y, r, inner = 0.28, rot = 0) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = rot + (i * Math.PI) / 4 - Math.PI / 2;
      const rad = i % 2 === 0 ? r : r * inner;
      ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    ctx.closePath();
  }
  function starN(ctx, x, y, n, r1, r2, rot = 0) {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = rot + (i * Math.PI) / n - Math.PI / 2;
      const rad = i % 2 === 0 ? r1 : r2;
      ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    ctx.closePath();
  }
  function inkFill(ctx, fill, lw = 5, stroke = INK) {
    ctx.fillStyle = fill; ctx.fill();
    if (lw > 0) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
  }

  // ---------- paper grain (generated once, seeded) ----------
  let GRAIN = null;
  function buildGrain() {
    const gw = W + 24, gh = H + 24;
    const c = document.createElement('canvas'); c.width = gw; c.height = gh;
    const g = c.getContext('2d');
    const rnd = mulberry32(1920);
    const img = g.createImageData(gw, gh);
    const d = img.data;
    for (let i = 0; i < gw * gh; i++) {
      const v = 128 + (rnd() - 0.5) * 70 + (rnd() < 0.004 ? -70 : 0);
      d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    // low-frequency mottling
    for (let i = 0; i < 260; i++) {
      const x = rnd() * gw, y = rnd() * gh, r = 60 + rnd() * 260;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      const light = rnd() < 0.5;
      gr.addColorStop(0, light ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)');
      gr.addColorStop(1, 'rgba(128,128,128,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // paper fibres
    g.lineCap = 'round';
    for (let i = 0; i < 900; i++) {
      const x = rnd() * gw, y = rnd() * gh, len = 8 + rnd() * 30, a = rnd() * TAU;
      g.strokeStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.16)';
      g.lineWidth = 0.6 + rnd() * 1.1;
      g.beginPath(); g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a + 0.6) * len * 0.5, y + Math.sin(a + 0.6) * len * 0.5, x + Math.cos(a) * len, y + Math.sin(a) * len);
      g.stroke();
    }
    GRAIN = c;
  }

  // ---------- background ----------
  function paintPaper(ctx, t, k) {
    const paper = ERAS[k].paper, ray = ERAS[k].ray;
    ctx.fillStyle = rgba(paper); ctx.fillRect(0, 0, W, H);
    // mid-century sunburst behind the mascot, rotating 2 ray-pairs per loop
    const n = 22, cx = XM, cy = 520, rot = (t / DUR) * (TAU / n) * 2;
    ctx.fillStyle = rgba(ray);
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a0 = rot + (i * TAU) / n, a1 = a0 + TAU / n / 2;
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a0) * 2600, cy + Math.sin(a0) * 2600);
      ctx.lineTo(cx + Math.cos(a1) * 2600, cy + Math.sin(a1) * 2600);
      ctx.closePath();
    }
    ctx.fill();
    // soft glow disc behind mascot
    const gr = ctx.createRadialGradient(cx, cy, 40, cx, cy, 460);
    gr.addColorStop(0, rgba(shade(paper, 0.18), 0.55));
    gr.addColorStop(1, rgba(paper, 0));
    ctx.fillStyle = gr; ctx.fillRect(cx - 460, cy - 460, 920, 920);
  }

  // Eras hand over with an iris wipe from the sunburst centre (a straight RGB blend of
  // navy→mustard goes muddy brown).
  function eraPhase(t) {
    for (let k = 0; k < 4; k++) {
      const u = eraLocal(t, k);
      if (u >= -HW && u < HW) return { from: (k + 3) % 4, to: k, p: (u + HW) / (2 * HW) };
    }
    const k = Math.floor(wrap(t, DUR) / 5);
    return { from: k, to: k, p: 1 };
  }
  function drawBackground(ctx, t, w) {
    const deco = blendC(w, 'deco');
    const ph = eraPhase(t);
    paintPaper(ctx, t, ph.from);
    if (ph.to !== ph.from) {
      const r = Math.pow(smooth(ph.p), 1.4) * 1750;
      ctx.save();
      ctx.beginPath(); ctx.arc(XM, 520, r, 0, TAU); ctx.clip();
      paintPaper(ctx, t, ph.to);
      ctx.restore();
      if (r > 1) {
        ctx.save();
        ctx.beginPath(); ctx.arc(XM, 520, r, 0, TAU);
        ctx.lineWidth = 18; ctx.strokeStyle = rgba(CREAMc, 0.55); ctx.stroke();
        ctx.beginPath(); ctx.arc(XM, 520, r + 12, 0, TAU);
        ctx.lineWidth = 3; ctx.strokeStyle = rgba(INKc, 0.35); ctx.stroke();
        ctx.restore();
      }
    }

    // atomic-age sparkles and boomerangs
    const stars = [[1560, 150, 26], [1790, 360, 16], [300, 250, 20], [1150, 120, 14], [110, 520, 18], [1690, 560, 12], [520, 90, 12], [950, 250, 10]];
    stars.forEach(([x, y, r], i) => {
      const tw = 0.8 + 0.25 * Math.sin(TAU * (t / DUR) * (3 + (i % 3)) + i);
      const bob = 6 * Math.sin(TAU * (t / DUR) * 2 + i * 1.3);
      ctx.save(); ctx.translate(x, y + bob);
      star4(ctx, 0, 0, r * tw, 0.22, (TAU / 4) * (t / DUR) * (i % 2 ? 1 : -1));
      ctx.fillStyle = rgba(deco); ctx.fill();
      ctx.restore();
    });
    const boom = [[1420, 300, 0.4], [200, 400, -0.7], [1860, 120, 1.2]];
    boom.forEach(([x, y, a], i) => {
      ctx.save(); ctx.translate(x, y + 5 * Math.sin(TAU * t / DUR * 2 + i)); ctx.rotate(a + 0.15 * Math.sin(TAU * t / DUR + i));
      ctx.beginPath(); ctx.moveTo(-34, 6); ctx.quadraticCurveTo(0, -30, 34, 6); ctx.quadraticCurveTo(0, -8, -34, 6);
      ctx.fillStyle = rgba(deco, 0.9); ctx.fill(); ctx.restore();
    });
    ctx.save();
    for (let i = 0; i < 26; i++) {
      const x = hash(i) * W, y = hash(i + 50) * 560;
      ctx.fillStyle = rgba(deco, 0.7);
      ctx.beginPath(); ctx.arc(x, y, 3 + hash(i + 9) * 3, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // ---------- draft guides ----------
  function drawGuides(ctx, t, w) {
    const gc = mix(blendC(w, 'text'), blendC(w, 'paper'), 0.35);
    ctx.save();
    ctx.strokeStyle = rgba(gc, 0.32); ctx.fillStyle = rgba(gc, 0.45);
    ctx.lineWidth = 1.5;
    ctx.setLineDash([10, 8]);
    [W / 3, (2 * W) / 3].forEach((x) => { ctx.beginPath(); ctx.moveTo(x, 40); ctx.lineTo(x, H - 150); ctx.stroke(); });
    [H / 3].forEach((y) => { ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(W - 40, y); ctx.stroke(); });
    ctx.setLineDash([4, 10]);
    rr(ctx, 60, 40, W - 120, H - 80, 18); ctx.stroke();
    ctx.setLineDash([]);
    // registration marks
    [[96, 76], [W - 96, 76], [96, H - 76], [W - 96, H - 76]].forEach(([x, y]) => {
      ctx.beginPath(); ctx.arc(x, y, 13, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 22, y); ctx.lineTo(x + 22, y); ctx.moveTo(x, y - 22); ctx.lineTo(x, y + 22); ctx.stroke();
    });
    // centre crosshair
    ctx.beginPath(); ctx.moveTo(W / 2 - 30, H / 2); ctx.lineTo(W / 2 + 30, H / 2); ctx.moveTo(W / 2, H / 2 - 30); ctx.lineTo(W / 2, H / 2 + 30); ctx.stroke();
    ctx.beginPath(); ctx.arc(W / 2, H / 2, 8, 0, TAU); ctx.stroke();
    ctx.font = `600 15px ${FONT_MONO}`;
    ctx.textAlign = 'right';
    ctx.fillText('FLD 12 · 1920×1080', W - 124, 114);
    ctx.fillText('SC.01  TK.' + (1 + Math.floor(wrap(t, DUR) / 5)), W - 124, 70);
    ctx.fillText('A-' + String(1 + Math.floor(wrap(t, DUR) * 12)).padStart(3, '0'), W - 124, 92);
    ctx.restore();
  }

  // ---------- filmstrip frame art ----------
  function frameArt(g, era, j, x, y, w, h, t, id) {
    const cx = x + w / 2, cy = y + h / 2;
    g.save();
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    rr(g, x, y, w, h, 12); g.clip();
    if (era === 0) {
      const gr = g.createLinearGradient(0, y, 0, y + h);
      gr.addColorStop(0, '#e6e1d4'); gr.addColorStop(1, '#8b857a');
      g.fillStyle = gr; g.fillRect(x, y, w, h);
      g.fillStyle = '#2a2622'; g.strokeStyle = '#2a2622';
      if (j === 0) { // moon with a face
        g.fillStyle = '#f6f2e8'; g.beginPath(); g.arc(cx, cy, 56, 0, TAU); g.fill();
        g.fillStyle = '#b9b3a6'; g.beginPath(); g.arc(cx + 26, cy - 10, 50, 0, TAU); g.fill();
        g.fillStyle = '#2a2622'; g.beginPath(); g.arc(cx - 26, cy - 10, 5, 0, TAU); g.fill();
        g.lineWidth = 3; g.beginPath(); g.arc(cx - 26, cy + 10, 12, 0.2, 1.6); g.stroke();
        [[x + 30, y + 30], [x + 190, y + 40], [x + 170, y + 150]].forEach(([sx, sy]) => { star4(g, sx, sy, 8); g.fillStyle = '#f6f2e8'; g.fill(); });
      } else if (j === 1) { // intertitle card
        g.fillStyle = '#16130f'; g.fillRect(x, y, w, h);
        g.strokeStyle = '#e9e3d4'; g.lineWidth = 2; rr(g, x + 14, y + 14, w - 28, h - 28, 8); g.stroke(); rr(g, x + 20, y + 20, w - 40, h - 40, 6); g.stroke();
        g.fillStyle = '#efe9da'; g.font = `30px ${FONT_SCRIPT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('Meanwhile…', cx, cy - 4);
      } else if (j === 2) { // skyline
        g.fillStyle = '#3b3631';
        [[10, 70], [44, 110], [80, 60], [108, 140], [150, 90], [180, 120]].forEach(([bx, bh]) => g.fillRect(x + bx, y + h - bh, 30, bh));
        g.fillStyle = '#e8e3d6'; for (let i = 0; i < 14; i++) g.fillRect(x + 16 + hash(i + id) * 180, y + h - 20 - hash(i * 3) * 90, 5, 7);
      } else if (j === 3) { // gentleman with top hat & cane
        g.fillStyle = '#26221e';
        g.fillRect(cx - 18, cy - 70, 36, 34); g.fillRect(cx - 30, cy - 38, 60, 6);
        g.beginPath(); g.arc(cx, cy - 16, 20, 0, TAU); g.fill();
        g.beginPath(); g.moveTo(cx - 34, cy + 90); g.lineTo(cx - 24, cy + 6); g.lineTo(cx + 24, cy + 6); g.lineTo(cx + 34, cy + 90); g.fill();
        g.lineWidth = 5; g.strokeStyle = '#26221e'; g.beginPath(); g.moveTo(cx + 50, cy + 90); g.lineTo(cx + 44, cy + 20); g.arc(cx + 54, cy + 20, 10, Math.PI, TAU); g.stroke();
      } else { // iris on a heart
        g.fillStyle = '#b9b3a6'; g.fillRect(x, y, w, h);
        g.fillStyle = '#2a2622';
        g.beginPath(); g.moveTo(cx, cy + 40); g.bezierCurveTo(cx - 70, cy - 10, cx - 30, cy - 60, cx, cy - 26); g.bezierCurveTo(cx + 30, cy - 60, cx + 70, cy - 10, cx, cy + 40); g.fill();
        const ir = g.createRadialGradient(cx, cy, 50, cx, cy, 120); ir.addColorStop(0, 'rgba(10,8,6,0)'); ir.addColorStop(0.6, 'rgba(10,8,6,0.95)');
        g.fillStyle = ir; g.fillRect(x, y, w, h);
      }
      // flicker, scratches and dust (boiling at 12 fps)
      const step = Math.floor(wrap(t, DUR) * 12);
      g.fillStyle = `rgba(255,250,235,${0.04 + 0.08 * hash(step + id * 7)})`; g.fillRect(x, y, w, h);
      g.strokeStyle = 'rgba(250,245,230,0.55)'; g.lineWidth = 1.4;
      for (let i = 0; i < 2; i++) { const sx = x + hash(step * 3 + i + id) * w; g.beginPath(); g.moveTo(sx, y); g.lineTo(sx + (hash(step + i) - 0.5) * 8, y + h); g.stroke(); }
      g.fillStyle = 'rgba(20,16,12,0.6)';
      for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(x + hash(step + i * 11 + id) * w, y + hash(step * 5 + i) * h, 1 + hash(i + step) * 2, 0, TAU); g.fill(); }
    } else if (era === 1) {
      const RED = '#d8392f', BLUE = '#1f4e9a', YEL = '#f3c233', WHT = '#fbf4e2', BLK = '#15120f';
      if (j === 0) {
        g.fillStyle = YEL; g.fillRect(x, y, w, h);
        starN(g, cx, cy, 12, 88, 56, 0.1); g.fillStyle = RED; g.fill(); g.lineWidth = 4; g.strokeStyle = BLK; g.stroke();
        g.fillStyle = WHT; g.font = `34px ${FONT_SLAB}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BANG!', cx, cy + 2);
      } else if (j === 1) {
        g.fillStyle = BLUE; g.fillRect(x, y, w, h);
        g.fillStyle = WHT; for (let i = -6; i < 10; i++) { g.beginPath(); g.moveTo(x + i * 36, y); g.lineTo(x + i * 36 + 18, y); g.lineTo(x + i * 36 + 18 + h, y + h); g.lineTo(x + i * 36 + h, y + h); g.fill(); }
        g.beginPath(); g.arc(cx, cy, 44, 0, TAU); g.fillStyle = RED; g.fill();
      } else if (j === 2) {
        g.fillStyle = WHT; g.fillRect(x, y, w, h);
        [[80, BLUE], [58, WHT], [38, RED], [16, WHT]].forEach(([r, c]) => { g.fillStyle = c; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill(); });
      } else if (j === 3) {
        g.fillStyle = BLK; g.fillRect(x, y, w, h);
        g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `44px ${FONT_SLAB}`;
        g.fillStyle = RED; g.fillText('CINÉ', cx - 20, cy - 26);
        g.fillStyle = '#4f86e0'; g.fillText('MA', cx + 40, cy + 26);
        g.fillStyle = WHT; g.font = `16px ${FONT_MONO}`; g.fillText('— 24× la vérité —', cx, cy + 66);
      } else {
        g.fillStyle = RED; g.fillRect(x, y, w, h);
        g.fillStyle = 'rgba(251,244,226,0.35)'; for (let i = 0; i < 7; i++) for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(x + 16 + i * 34 + (k % 2) * 17, y + 16 + k * 32, 7, 0, TAU); g.fill(); }
        // sunglasses, pure Godard
        g.fillStyle = BLK; rr(g, cx - 72, cy - 18, 64, 40, 14); g.fill(); rr(g, cx + 8, cy - 18, 64, 40, 14); g.fill(); g.fillRect(cx - 10, cy - 12, 20, 8);
        g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(cx - 62, cy - 10, 14, 6); g.fillRect(cx + 18, cy - 10, 14, 6);
      }
    } else if (era === 2) {
      if (j === 0) {
        const bars = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
        bars.forEach((c, i) => { g.fillStyle = c; g.fillRect(x + (i * w) / 7, y, w / 7 + 1, h * 0.7); });
        g.fillStyle = '#101010'; g.fillRect(x, y + h * 0.7, w, h * 0.3);
        g.fillStyle = '#f2f2f2'; g.fillRect(x + w * 0.1, y + h * 0.76, w * 0.2, h * 0.16);
      } else if (j === 1) {
        g.fillStyle = '#1a2fbf'; g.fillRect(x, y, w, h);
        g.fillStyle = '#eef'; g.font = `bold 30px ${FONT_MONO}`; g.textBaseline = 'middle';
        g.fillText('PLAY ▶', x + 20, y + 44);
        g.font = `bold 18px ${FONT_MONO}`; g.fillText('SP  0:12:04', x + 20, y + h - 30);
      } else if (j === 2) {
        const gr = g.createLinearGradient(0, y, 0, y + h * 0.62); gr.addColorStop(0, '#2a0f4f'); gr.addColorStop(1, '#ff4f8b');
        g.fillStyle = gr; g.fillRect(x, y, w, h);
        g.save(); g.beginPath(); g.arc(cx, y + h * 0.62, 56, Math.PI, TAU); g.clip();
        const sg = g.createLinearGradient(0, y + h * 0.62 - 56, 0, y + h * 0.62); sg.addColorStop(0, '#ffe45e'); sg.addColorStop(1, '#ff7a3d');
        g.fillStyle = sg; g.fillRect(cx - 60, y, 120, h);
        g.fillStyle = '#ff4f8b'; for (let i = 0; i < 4; i++) g.fillRect(cx - 60, y + h * 0.62 - 10 - i * 11, 120, 3 + i * 0.5);
        g.restore();
        g.fillStyle = '#1a0833'; g.fillRect(x, y + h * 0.62, w, h);
        g.strokeStyle = '#ff5cd1'; g.lineWidth = 1.5;
        for (let i = 0; i < 6; i++) { const yy = y + h * 0.62 + (i * i + 1) * 2.4; g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke(); }
        for (let i = -6; i <= 6; i++) { g.beginPath(); g.moveTo(cx + i * 8, y + h * 0.62); g.lineTo(cx + i * 44, y + h); g.stroke(); }
      } else if (j === 3) {
        g.fillStyle = '#17807a'; g.fillRect(x, y, w, h);
        const face = ['..YYYY..', '.YYYYYY.', 'YYKYYKYY', 'YYYYYYYY', 'YKYYYYKY', 'YYKKKKYY', '.YYYYYY.', '..YYYY..'];
        const ps = 16, ox = cx - 4 * ps, oy = cy - 4 * ps;
        face.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === '.') return; g.fillStyle = ch === 'Y' ? '#ffd83a' : '#1b1b1b'; g.fillRect(ox + c * ps, oy + r * ps, ps - 1, ps - 1); }));
      } else {
        g.fillStyle = '#6e7c78'; g.fillRect(x, y, w, h);
        g.fillStyle = '#58655f'; g.beginPath(); g.moveTo(x, y + h); g.lineTo(x + 70, y + 80); g.lineTo(x + 130, y + 130); g.lineTo(x + 180, y + 70); g.lineTo(x + w, y + h); g.fill();
        g.strokeStyle = '#f4f4f4'; g.lineWidth = 3;
        const b = 16, m = 16;
        [[x + m, y + m, 1, 1], [x + w - m, y + m, -1, 1], [x + m, y + h - m, 1, -1], [x + w - m, y + h - m, -1, -1]].forEach(([bx, by, sx, sy]) => { g.beginPath(); g.moveTo(bx, by + b * sy); g.lineTo(bx, by); g.lineTo(bx + b * sx, by); g.stroke(); });
        const on = Math.floor(wrap(t, DUR) * 2) % 2 === 0;
        if (on) { g.fillStyle = '#ff3030'; g.beginPath(); g.arc(x + 36, y + 38, 7, 0, TAU); g.fill(); }
        g.fillStyle = '#f4f4f4'; g.font = `bold 16px ${FONT_MONO}`; g.textBaseline = 'middle'; g.fillText('REC', x + 48, y + 39);
        g.strokeRect(x + w - 60, y + 30, 30, 14); g.fillRect(x + w - 30, y + 34, 4, 6); g.fillRect(x + w - 57, y + 33, 16, 8);
      }
      g.fillStyle = 'rgba(0,0,0,0.16)'; for (let yy = y; yy < y + h; yy += 4) g.fillRect(x, yy, w, 2);
    } else {
      const pals = [['#ffb3a7', '#ffd9a0'], ['#a8e6cf', '#dcedc1'], ['#c3b5f5', '#f3c6e8'], ['#ffd29d', '#ff9e8a'], ['#f7ecd3', '#f4d9a6']];
      const [c0, c1] = pals[j];
      const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, c0); gr.addColorStop(1, c1);
      g.fillStyle = gr; g.fillRect(x, y, w, h);
      g.fillStyle = '#ffffff'; g.strokeStyle = '#ffffff';
      if (j === 0) {
        g.beginPath(); g.arc(cx, cy, 52, 0, TAU); g.fill();
        g.fillStyle = '#ff7f6e'; g.beginPath(); g.moveTo(cx - 14, cy - 24); g.lineTo(cx + 26, cy); g.lineTo(cx - 14, cy + 24); g.closePath(); g.fill();
      } else if (j === 1) {
        g.fillStyle = '#fff6d8'; g.beginPath(); g.arc(cx + 50, cy - 40, 22, 0, TAU); g.fill();
        g.fillStyle = '#5fbf9f'; g.beginPath(); g.moveTo(x, y + h); g.lineTo(cx - 40, cy - 10); g.lineTo(cx + 10, cy + 40); g.lineTo(cx + 60, cy + 10); g.lineTo(x + w, y + h); g.fill();
      } else if (j === 2) {
        [[cx - 40, cy - 20, 36], [cx + 44, cy + 26, 24], [cx + 30, cy - 50, 14]].forEach(([sx, sy, sr]) => { star4(g, sx, sy, sr, 0.3); g.fill(); });
      } else if (j === 3) {
        g.fillStyle = ORANGE; g.beginPath(); g.arc(cx, cy, 58, 0, TAU); g.fill();
        g.fillStyle = CREAM; g.beginPath(); g.arc(cx, cy, 24, 0, TAU); g.fill();
        g.fillStyle = HOLE; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(cx + Math.cos(i * TAU / 6) * 42, cy + Math.sin(i * TAU / 6) * 42, 9, 0, TAU); g.fill(); }
      } else {
        g.fillStyle = INK; g.font = `54px ${FONT_SCRIPT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('fin.', cx, cy - 6);
      }
      const sh = g.createLinearGradient(x, y, x + w, y + h); sh.addColorStop(0, 'rgba(255,255,255,0.25)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)');
      g.fillStyle = sh; g.fillRect(x, y, w, h);
    }
    g.restore();
  }

  // ---------- filmstrip ----------
  let STRIP = null;
  function drawStrip(ctx, t, w) {
    if (!STRIP) { STRIP = document.createElement('canvas'); STRIP.width = W; STRIP.height = STRIP_H; }
    const g = STRIP.getContext('2d');
    g.clearRect(0, 0, W, STRIP_H);
    g.fillStyle = '#2c231d'; g.fillRect(0, 0, W, STRIP_H);
    g.fillStyle = '#3a2f27'; g.fillRect(0, 4, W, 4); g.fillRect(0, STRIP_H - 8, W, 4);
    const nFrames = L / PITCH;
    for (let i = 0; i < nFrames; i++) {
      const s0 = i * PITCH, x = stripX(s0, t);
      if (x > W + 10 || x < -PITCH - 10) continue;
      const tau = stripTau(s0 + PITCH / 2), era = Math.floor(tau / 5), j = Math.floor(tau) % 5;
      frameArt(g, era, j, x + 10, 48, PITCH - 20, 184, t, i);
      g.fillStyle = '#e9a53a'; g.font = `600 13px ${FONT_MONO}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(i * 4 + 1).padStart(2, '0'), x + 30, 257);
      g.fillText('▸', x + 150, 257);
    }
    // perforations punched through
    g.globalCompositeOperation = 'destination-out';
    const off = wrap(V * t, 60);
    for (let px = -60 + off; px < W + 60; px += 60) {
      rr(g, px + 16, 14, 28, 20, 5); g.fill();
      rr(g, px + 16, STRIP_H - 34, 28, 20, 5); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
    // hard retro drop shadow + strip
    ctx.save();
    ctx.globalAlpha = 0.22; ctx.fillStyle = '#000'; ctx.fillRect(0, STRIP_Y + 14, W, STRIP_H);
    ctx.globalAlpha = 1;
    ctx.drawImage(STRIP, 0, STRIP_Y);
    ctx.strokeStyle = rgba(mix(CREAMc, blendC(w, 'paper'), 0.4), 0.35); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, STRIP_Y + 1); ctx.lineTo(W, STRIP_Y + 1); ctx.moveTo(0, STRIP_Y + STRIP_H - 1); ctx.lineTo(W, STRIP_Y + STRIP_H - 1); ctx.stroke();
    ctx.restore();
  }

  // semi-transparent splice tape at era joins and at every 1960s jump cut
  const SPLICES = [];
  for (let k = 0; k < 4; k++) SPLICES.push({ s: XM - 1200 * k, jump: false, k });
  for (let n = 1; n <= 4; n++) SPLICES.push({ s: XM - 1200 - PITCH * n, jump: true, k: 10 + n });
  function drawSplices(ctx, t) {
    SPLICES.forEach((sp) => {
      const x = stripX(sp.s, t);
      if (x < -120 || x > W + 120) return;
      ctx.save();
      if (sp.jump) {
        ctx.strokeStyle = 'rgba(250,240,215,0.8)'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(x - 14, STRIP_Y + 40); ctx.lineTo(x + 14, STRIP_Y + STRIP_H - 40); ctx.stroke();
        // grease-pencil cue mark
        ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x - 70, STRIP_Y + 60); ctx.lineTo(x - 40, STRIP_Y + 90); ctx.moveTo(x - 40, STRIP_Y + 60); ctx.lineTo(x - 70, STRIP_Y + 90); ctx.stroke();
      }
      ctx.translate(x, STRIP_Y + STRIP_H / 2);
      ctx.rotate((hash(sp.k + 3) - 0.5) * 0.08 + (sp.jump ? 0.1 : 0));
      const tw = sp.jump ? 58 : 76, th = STRIP_H + 26;
      ctx.fillStyle = 'rgba(255,244,214,0.34)';
      rr(ctx, -tw / 2, -th / 2, tw, th, 3); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(-tw / 2 + 6, -th / 2, 7, th);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) { const yy = -th / 2 + 30 + hash(sp.k * 9 + i) * (th - 60); ctx.beginPath(); ctx.moveTo(-tw / 2 + 4, yy); ctx.quadraticCurveTo(0, yy + 6, tw / 2 - 4, yy - 3); ctx.stroke(); }
      // torn ends
      ctx.fillStyle = 'rgba(255,244,214,0.34)';
      [-1, 1].forEach((sgn) => {
        ctx.beginPath(); ctx.moveTo(-tw / 2, (sgn * th) / 2);
        for (let i = 0; i <= 6; i++) ctx.lineTo(-tw / 2 + (i * tw) / 6, (sgn * th) / 2 + sgn * (i % 2 ? 5 : 0));
        ctx.lineTo(tw / 2, (sgn * th) / 2); ctx.fill();
      });
      ctx.restore();
    });
  }

  // ---------- mascot ----------
  // Hops: centre times (s). Boundary hops carry the mascot between eras; 60s hops clear each jump-cut splice.
  const HOPS = [{ c: 0, h: 120 }, { c: 5, h: 120 }, { c: 6, h: 150 }, { c: 7, h: 150 }, { c: 8, h: 200, flip: true }, { c: 9, h: 150 }, { c: 10, h: 120 }, { c: 15, h: 110 }];
  const AIR = 0.56;
  function hopState(t) {
    let lift = 0, squash = 0, spin = 0, air = 0, tuck = 0;
    HOPS.forEach((hp) => {
      const d = wrapS(t - hp.c);
      const a0 = -AIR / 2, a1 = AIR / 2;
      if (d > a0 - 0.2 && d < a0) { const q = (d - (a0 - 0.2)) / 0.2; squash += 0.2 * Math.sin(q * Math.PI * 0.5) ** 2; }
      if (d >= a0 && d <= a1) {
        const p = (d - a0) / AIR;
        lift += 4 * hp.h * p * (1 - p);
        squash += -0.16 * Math.abs(1 - 2 * p) ** 1.5 * (p < 0.5 ? 1 : 0.7);
        air = Math.max(air, smooth(p / 0.12) * smooth((1 - p) / 0.12));
        tuck = Math.max(tuck, Math.sin(p * Math.PI));
        if (hp.flip) spin = -TAU * easeOutCubic(smooth(p));
      }
      if (d > a1 && d < a1 + 0.36) { const q = (d - a1) / 0.36; squash += 0.26 * Math.exp(-4.5 * q) * Math.cos(q * TAU * 0.85); }
    });
    return { lift, squash, spin, air, tuck };
  }
  const SNIPS = [1.2, 2.3, 3.4];
  const TAPS = [1.1, 1.45, 2.3, 3.15, 3.5];
  const BLINKS = [3.9, 7.45, 12.7, 13.95, 18.4];
  const CUT_Y = 452, CELL_X = 1016, CELL_W = 104, CELL_FH = 118;
  const CRT_X = 1150;

  function impulse(u, times, a = 0.06, b = 0.26) { // quick in, slow out
    let v = 0;
    times.forEach((c) => { const d = u - c; if (d > -a && d < b) v = Math.max(v, d < 0 ? smooth((d + a) / a) : 1 - smooth(d / b)); });
    return v;
  }

  function mascotPose(t, w) {
    const hs = hopState(t);
    const u0 = eraLocal(t, 0), u1 = eraLocal(t, 1), u2 = eraLocal(t, 2), u3 = eraLocal(t, 3);
    const idle = 0.03 * Math.sin(TAU * t * 1.0);
    let squash = hs.squash + idle * (1 - hs.air);
    let lean = 0.03 * Math.sin(TAU * t * 0.5);
    let lookX = 0, lookY = 0, faceDX = 0, faceDY = 0;
    let handR = null, handL = null, gripR = 0, gripL = 0, handRType = 'open', handLType = 'open';
    let mouth = hs.air > 0.3 ? 'o' : 'smile', eyes = 'open', bowDip = 0;
    let scissorsOpen = 1;

    // era 0: snipping the hanging celluloid
    if (w[0] > 0) {
      const g = smooth((u0 - 0.15) / 0.45) * (1 - smooth((u0 - 3.95) / 0.45));
      const snip = impulse(u0, SNIPS, 0.07, 0.3);
      const antic = impulse(u0, SNIPS.map((s) => s - 0.12), 0.25, 0.1);
      const lunge = snip * 14 - antic * 10;
      handR = { x: 928 + lunge, y: CUT_Y + 6 }; gripR = g * w[0]; handRType = 'fist';
      scissorsOpen = clamp(1 + antic * 0.35 - snip * 1.4, 0, 1.35);
      lean += (antic * -0.07 + snip * 0.1) * w[0];
      squash += (antic * 0.08 - snip * 0.06) * w[0];
      lookX += 0.9 * w[0]; lookY += (0.2 + impulse(u0, SNIPS.map((s) => s + 0.25), 0.1, 0.4) * 0.8) * w[0];
      handL = { x: XM - 150, y: 470 }; gripL = g * w[0] * 0.9; handLType = 'open'; // hand on hip
      if (snip > 0.5 && w[0] > 0.5) mouth = 'grin';
    }
    // era 1: jump-cut hops, arms flung up in the air
    if (w[1] > 0) {
      lookX += -0.6 * w[1]; lookY += 0.35 * w[1];
      lean += -0.08 * hs.air * w[1];
      if (hs.air > 0.3 && w[1] > 0.5) mouth = 'o';
    }
    // era 2: tapping the CRT
    if (w[2] > 0) {
      const g = smooth((u2 - 0.35) / 0.45) * (1 - smooth((u2 - 4.0) / 0.4));
      const tap = impulse(u2, TAPS, 0.07, 0.2);
      handR = { x: lerp(958, 1000, tap), y: lerp(470, 452, tap) }; gripR = g * w[2]; handRType = 'point';
      lean += (0.07 + tap * 0.05) * g * w[2];
      lookX += 0.9 * w[2]; lookY += -0.1 * w[2];
      handL = { x: XM - 136, y: 520 }; gripL = g * w[2] * 0.6; handLType = 'open';
      if (tap > 0.5 && w[2] > 0.5) mouth = 'grin';
    }
    // era 3: the bow beside "fin."
    if (w[3] > 0) {
      const bow = smooth((u3 - 1.35) / 0.5) * (1 - smooth((u3 - 2.85) / 0.45));
      const present = smooth((u3 - 3.2) / 0.35) * (1 - smooth((u3 - 4.15) / 0.3));
      bowDip = bow * w[3];
      squash += bow * 0.12 * w[3];
      lean += bow * 0.22 * w[3];
      faceDY += bow * 26 * w[3]; faceDX += bow * 10 * w[3];
      if (bow > 0.45) { eyes = 'happy'; mouth = 'grin'; }
      // arm across belly + flourish arm during the bow; open-hand "ta-da" towards fin. afterwards
      const wave = Math.sin(TAU * u3 * 2.5) * present;
      const m = present / (bow + present + 1e-6);
      handR = { x: lerp(XM + 6, 1000, m), y: lerp(585, 372 + wave * 16, m) }; // across the belly → "ta-da" at fin.
      handL = { x: XM - 250, y: 520 }; // sweeping flourish
      gripR = Math.max(bow, present) * w[3]; gripL = bow * w[3];
      handRType = 'open'; handLType = 'open';
      lookX += (0.8 * present) * w[3]; lookY += -0.2 * present * w[3];
    }
    const bl = BLINKS.some((b) => Math.abs(wrapS(t - b)) < 0.08);
    if (bl && eyes === 'open') eyes = 'blink';
    return { hs, squash, lean, lookX, lookY, faceDX, faceDY, handR, handL, gripR, gripL, handRType, handLType, mouth, eyes, scissorsOpen, bowDip, w };
  }

  const apply = (M, p) => ({ x: M.a * p.x + M.c * p.y + M.e, y: M.b * p.x + M.d * p.y + M.f });

  function hose(ctx, a, b, len, bendSign, width, halo) {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
    const bow = Math.sqrt(Math.max(0, len * len - d * d)) * 0.55 + 6;
    const nx = -dy / d, ny = dx / d;
    const c = { x: (a.x + b.x) / 2 + nx * bow * bendSign, y: (a.y + b.y) / 2 + ny * bow * bendSign };
    ctx.lineCap = 'round';
    if (halo) { ctx.strokeStyle = halo; ctx.lineWidth = width + 8; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(c.x, c.y, b.x, b.y); ctx.stroke(); }
    ctx.strokeStyle = INK; ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(c.x, c.y, b.x, b.y); ctx.stroke();
    return Math.atan2(b.y - c.y, b.x - c.x);
  }

  function glove(ctx, p, ang, type, flip) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(ang);
    if (flip) ctx.scale(1, -1);
    // cuff
    ctx.beginPath(); ctx.ellipse(-16, 0, 9, 17, 0, 0, TAU); inkFill(ctx, GLOVE, 4);
    if (type === 'fist') {
      ctx.beginPath(); ctx.arc(6, 0, 20, 0, TAU); inkFill(ctx, GLOVE, 4.5);
      ctx.strokeStyle = INK; ctx.lineWidth = 3;
      [-7, 2, 11].forEach((yy) => { ctx.beginPath(); ctx.moveTo(14, yy - 3); ctx.lineTo(22, yy - 2); ctx.stroke(); });
    } else if (type === 'point') {
      ctx.beginPath(); ctx.arc(4, 3, 19, 0, TAU); inkFill(ctx, GLOVE, 4.5);
      rr(ctx, 8, -14, 34, 13, 6.5); inkFill(ctx, GLOVE, 4.5);
      ctx.beginPath(); ctx.ellipse(0, -14, 7, 10, -0.6, 0, TAU); inkFill(ctx, GLOVE, 4);
    } else {
      ctx.beginPath(); ctx.ellipse(8, 0, 20, 22, 0, 0, TAU); inkFill(ctx, GLOVE, 4.5);
      [-13, -3, 7].forEach((yy, i) => { rr(ctx, 16, yy - 4, 22 - i * 2, 11, 5.5); inkFill(ctx, GLOVE, 4); });
      ctx.beginPath(); ctx.ellipse(2, 20, 8, 11, 0.5, 0, TAU); inkFill(ctx, GLOVE, 4);
      ctx.beginPath(); ctx.ellipse(8, 0, 16, 18, 0, 0, TAU); ctx.fillStyle = GLOVE; ctx.fill();
    }
    ctx.restore();
  }

  function shoe(ctx, p, dir, tilt) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(tilt); ctx.scale(dir, 1);
    ctx.beginPath(); ctx.ellipse(16, -14, 34, 17, -0.05, 0, TAU); inkFill(ctx, SHOE, 5);
    ctx.beginPath(); ctx.ellipse(24, -21, 12, 5, -0.2, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();
    ctx.fillStyle = INK; rr(ctx, -12, -4, 60, 7, 3); ctx.fill();
    ctx.restore();
  }

  function scissors(ctx, p, ang, open, scale) {
    if (scale <= 0.01) return;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(ang); ctx.scale(scale, scale);
    const a = 0.34 * open;
    // handle loops (behind the fist)
    [[-1, 1], [1, -1]].forEach(([s]) => {
      ctx.save(); ctx.rotate(s * a * 0.8);
      ctx.beginPath(); ctx.ellipse(-8, s * 20, 20, 13, s * 0.3, 0, TAU);
      ctx.lineWidth = 13; ctx.strokeStyle = INK; ctx.stroke();
      ctx.lineWidth = 7; ctx.strokeStyle = BRASS; ctx.stroke();
      ctx.restore();
    });
    // blades
    [1, -1].forEach((s) => {
      ctx.save(); ctx.translate(26, 0); ctx.rotate(s * a);
      ctx.beginPath(); ctx.moveTo(-12, s * 3); ctx.lineTo(104, s * 1); ctx.quadraticCurveTo(70, s * 22, -4, s * 17); ctx.closePath();
      inkFill(ctx, s < 0 ? BRASS : BRASS_D, 4.5);
      ctx.beginPath(); ctx.moveTo(8, s * 7); ctx.lineTo(78, s * 6); ctx.strokeStyle = BRASS_L; ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
    });
    ctx.beginPath(); ctx.arc(26, 0, 6, 0, TAU); inkFill(ctx, BRASS_L, 3.5);
    ctx.restore();
  }

  function drawMascot(ctx, t, w) {
    const P = mascotPose(t, w);
    const { hs } = P;
    const s = clamp(P.squash, -0.25, 0.32);
    const sy = 1 - s, sx = 1 + s * 0.85;
    const legF = clamp(1 - s * 1.5 - P.bowDip * 0.25, 0.45, 1.2);
    const tuckF = 1 - hs.tuck * 0.35;
    const hipY = GROUND - hs.lift - LEG * legF * tuckF;
    const cx = XM, cy = hipY - R * sy * 0.9;
    const rot = P.lean + hs.spin;
    const cos = Math.cos(rot), sin = Math.sin(rot);
    // body-local → world (rotate about body centre, then squash in body axes)
    const M = { a: cos * sx, b: sin * sx, c: -sin * sy, d: cos * sy, e: cx, f: cy };
    const paper = blendC(w, 'paper');
    const halo = rgba(mix(CREAMc, paper, 0.25), 0.55 * (w[1] + w[3]));

    // shadow on the strip
    ctx.save();
    const shw = 170 * (1 - clamp(hs.lift / 320, 0, 0.7));
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(cx, GROUND + 2, shw / 2, 12, 0, 0, TAU); ctx.fill();
    ctx.restore();

    // construction guides around the character
    ctx.save();
    ctx.strokeStyle = rgba(mix(blendC(w, 'text'), paper, 0.3), 0.28); ctx.lineWidth = 1.5; ctx.setLineDash([6, 7]);
    ctx.beginPath(); ctx.arc(cx, cy, R + 22, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - R - 50, cy); ctx.lineTo(cx + R + 50, cy); ctx.moveTo(cx, cy - R - 50); ctx.lineTo(cx, GROUND + 10); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // legs
    const hipL = apply(M, { x: -38, y: R * 0.86 }), hipR = apply(M, { x: 38, y: R * 0.86 });
    const tuckL = apply(M, { x: -52, y: R * 0.86 + LEG * 0.7 }), tuckR = apply(M, { x: 52, y: R * 0.86 + LEG * 0.7 });
    const splay = 12 * s;
    const gL = { x: cx - 50 - splay, y: GROUND }, gR = { x: cx + 50 + splay, y: GROUND };
    const fL = { x: lerp(gL.x, tuckL.x, hs.air), y: lerp(gL.y, tuckL.y, hs.air) };
    const fR = { x: lerp(gR.x, tuckR.x, hs.air), y: lerp(gR.y, tuckR.y, hs.air) };
    ctx.save();
    hose(ctx, hipL, { x: fL.x, y: fL.y - 12 }, LEG + 8, 1, 17, halo);
    hose(ctx, hipR, { x: fR.x, y: fR.y - 12 }, LEG + 8, -1, 17, halo);
    shoe(ctx, fL, -1, hs.air * (rot - 0.35));
    shoe(ctx, fR, 1, hs.air * (rot + 0.35));
    ctx.restore();

    // arms: idle pose in body-local space, blended toward world targets
    const flap = Math.sin(TAU * t * 2);
    const idleR = apply(M, { x: R + 56 + hs.tuck * 20, y: 40 - hs.tuck * 150 + flap * 6 * (1 - hs.air) });
    const idleL = apply(M, { x: -R - 56 - hs.tuck * 20, y: 40 - hs.tuck * 150 - flap * 6 * (1 - hs.air) });
    const gr = P.handR ? P.gripR * (1 - hs.air) : 0, gl = P.handL ? P.gripL * (1 - hs.air) : 0;
    const hR = P.handR ? { x: lerp(idleR.x, P.handR.x, gr), y: lerp(idleR.y, P.handR.y, gr) } : idleR;
    const hL = P.handL ? { x: lerp(idleL.x, P.handL.x, gl), y: lerp(idleL.y, P.handL.y, gl) } : idleL;
    const shR = apply(M, { x: R * 0.9, y: 18 }), shL = apply(M, { x: -R * 0.9, y: 18 });

    // left arm behind body
    ctx.save();
    const angL = hose(ctx, shL, hL, ARM, 1, 16, halo);
    glove(ctx, hL, angL, gl > 0.5 ? P.handLType : 'open', true);
    ctx.restore();

    // body: the reel
    ctx.save();
    ctx.setTransform(ctx.getTransform().multiply(new DOMMatrix([M.a, M.b, M.c, M.d, M.e, M.f])));
    ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); inkFill(ctx, ORANGE, 0);
    ctx.save(); ctx.clip();
    ctx.beginPath(); ctx.arc(22, 26, R, 0, TAU); ctx.arc(0, 0, R + 40, 0, TAU, true); ctx.fillStyle = ORANGE_D; ctx.fill();
    ctx.beginPath(); ctx.arc(-18, -22, R * 0.9, Math.PI * 1.05, Math.PI * 1.55); ctx.strokeStyle = ORANGE_L; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.stroke();
    ctx.restore();
    ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, R - 14, 0, TAU); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(120,45,10,0.55)'; ctx.stroke();
    const spinA = TAU * (t / DUR) * 10 - hs.spin * 0;
    for (let i = 0; i < 6; i++) {
      const a = spinA + (i * TAU) / 6;
      ctx.beginPath(); ctx.arc(Math.cos(a) * 93, Math.sin(a) * 93, 15, 0, TAU); inkFill(ctx, HOLE, 4);
    }
    // hub + face
    ctx.beginPath(); ctx.arc(0, 0, 70, 0, TAU); inkFill(ctx, CREAM, 5);
    ctx.beginPath(); ctx.arc(0, 0, 70, 0.3, 1.5); ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(200,160,110,0.45)'; ctx.stroke();
    const fx = P.faceDX + P.lookX * 9, fy = P.faceDY + P.lookY * 7 - 4;
    ctx.save(); ctx.translate(fx, fy);
    // cheeks
    ctx.fillStyle = 'rgba(240,110,80,0.35)';
    ctx.beginPath(); ctx.ellipse(-40, 16, 11, 7, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(40, 16, 11, 7, 0, 0, TAU); ctx.fill();
    // eyes (pie-cut, 1930s style)
    [-1, 1].forEach((sd) => {
      const ex = sd * 21, ey = -16;
      if (P.eyes === 'happy') {
        ctx.beginPath(); ctx.arc(ex, ey + 6, 11, Math.PI * 1.1, Math.PI * 1.9); ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke();
      } else {
        const bs = P.eyes === 'blink' ? 0.12 : 1;
        ctx.save(); ctx.translate(ex, ey); ctx.scale(1, bs);
        ctx.beginPath(); ctx.ellipse(0, 0, 10.5, 17, 0, 0, TAU); ctx.fillStyle = INK; ctx.fill();
        if (bs > 0.5) {
          const px = P.lookX * 3.5, py = P.lookY * 5 - 5;
          ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, 6, -Math.PI * 0.35, Math.PI * 0.2); ctx.closePath(); ctx.fillStyle = CREAM; ctx.fill();
        }
        ctx.restore();
      }
      // brows
      const lift = hs.air * 8 + (P.mouth === 'grin' ? 3 : 0);
      ctx.beginPath(); ctx.moveTo(ex - 10, ey - 25 - lift); ctx.quadraticCurveTo(ex, ey - 31 - lift, ex + 10, ey - 25 - lift + sd * 1.5);
      ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke();
    });
    // mouth
    if (P.mouth === 'o') {
      ctx.beginPath(); ctx.ellipse(0, 22, 10, 13, 0, 0, TAU); inkFill(ctx, '#5a1a14', 4);
      ctx.beginPath(); ctx.ellipse(0, 28, 6, 5, 0, 0, TAU); ctx.fillStyle = '#e8615a'; ctx.fill();
    } else {
      const big = P.mouth === 'grin' ? 1 : 0;
      ctx.beginPath(); ctx.moveTo(-26, 10); ctx.quadraticCurveTo(0, 44 + big * 8, 26, 10); ctx.quadraticCurveTo(0, 22, -26, 10);
      inkFill(ctx, '#5a1a14', 4);
      ctx.save(); ctx.clip();
      ctx.beginPath(); ctx.ellipse(4, 34 + big * 4, 12, 9, 0, 0, TAU); ctx.fillStyle = '#e8615a'; ctx.fill();
      ctx.restore();
      ctx.beginPath(); ctx.moveTo(-26, 10); ctx.quadraticCurveTo(0, 44 + big * 8, 26, 10); ctx.quadraticCurveTo(0, 22, -26, 10);
      ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
    }
    // 1960s: Godard sunglasses pop on
    const shades = easeOutBack(clamp((eraLocal(t, 1) + 0.1) / 0.35)) * (1 - easeInBack(clamp((eraLocal(t, 1) - 4.85) / 0.3)));
    if (shades > 0.01 && P.eyes !== 'happy') {
      ctx.save(); ctx.translate(0, -16); ctx.scale(shades, shades);
      rr(ctx, -40, -14, 36, 26, 9); inkFill(ctx, '#15120f', 3, INK);
      rr(ctx, 4, -14, 36, 26, 9); inkFill(ctx, '#15120f', 3, INK);
      ctx.fillStyle = '#15120f'; ctx.fillRect(-6, -8, 12, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(-34, -9, 10, 4); ctx.fillRect(10, -9, 10, 4);
      ctx.restore();
    }
    ctx.restore(); // face
    ctx.restore(); // body

    // right arm in front, with scissors in the 1920s
    ctx.save();
    const angR = hose(ctx, shR, hR, ARM, -1, 16, halo);
    const scScale = easeOutBack(clamp(P.gripR * 1.4 - 0.2)) * (P.handRType === 'fist' ? 1 : 0);
    if (P.handRType === 'fist' && scScale > 0.01) {
      scissors(ctx, hR, lerp(angR, 0, clamp(gr)), P.scissorsOpen, scScale);
    }
    glove(ctx, hR, lerp(angR, 0, P.handRType === 'fist' ? clamp(gr) : 0), gr > 0.4 ? P.handRType : 'open', false);
    ctx.restore();
    return P;
  }

  // ---------- era props ----------
  function drawCelluloid(ctx, t) {
    const u = eraLocal(t, 0);
    if (u < -0.8 || u > 5.2) return;
    const enter = easeOutBack(clamp((u + 0.5) / 0.8), 1.2);
    const exit = easeInBack(clamp((u - 4.3) / 0.6));
    const dy = -(1 - enter) * 720 - exit * 760;
    // b: how much film hangs below the cut line; f: total film fed so far
    let b = CELL_FH, fed = 0, snipped = 0;
    SNIPS.forEach((sn) => {
      if (u >= sn) { snipped++; }
      const q = smooth((u - sn - 0.35) / 0.5);
      if (u >= sn) { b = CELL_FH * q; fed += CELL_FH * q; }
    });
    ctx.save();
    ctx.translate(0, dy);
    const bottom = CUT_Y + b;
    const x = CELL_X - CELL_W / 2;
    // film body, frames drawn from the bottom up
    ctx.save();
    ctx.beginPath(); ctx.rect(x - 10, -40, CELL_W + 20, bottom + 40); ctx.clip();
    ctx.fillStyle = 'rgba(30,26,22,0.92)'; ctx.fillRect(x, -40, CELL_W, bottom + 40);
    for (let k = 0; k < 7; k++) {
      const fy = bottom - CELL_FH * (k + 1);
      const id = snipped + k;
      const gg = ctx.createLinearGradient(0, fy, 0, fy + CELL_FH);
      gg.addColorStop(0, '#e9e4d8'); gg.addColorStop(1, '#9b958a');
      ctx.fillStyle = gg; rr(ctx, x + 18, fy + 8, CELL_W - 36, CELL_FH - 16, 6); ctx.fill();
      ctx.fillStyle = '#2a2622';
      ctx.save(); ctx.translate(CELL_X, fy + CELL_FH / 2);
      const m = id % 3;
      if (m === 0) { ctx.beginPath(); ctx.arc(0, -8, 14, 0, TAU); ctx.fill(); ctx.fillRect(-14, 8, 28, 30); }
      else if (m === 1) { ctx.fillRect(-20, -30, 10, 60); ctx.fillRect(-4, -12, 10, 42); ctx.fillRect(12, -24, 10, 54); }
      else { star4(ctx, 0, 0, 26, 0.3); ctx.fill(); }
      ctx.restore();
      ctx.fillStyle = '#e2a83b';
      for (let pp = 0; pp < 4; pp++) {
        ctx.fillStyle = 'rgba(247,236,211,0.85)';
        rr(ctx, x + 4, fy + 6 + pp * 29, 9, 16, 3); ctx.fill();
        rr(ctx, x + CELL_W - 13, fy + 6 + pp * 29, 9, 16, 3); ctx.fill();
      }
    }
    ctx.restore();
    ctx.strokeStyle = INK; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x, -40); ctx.lineTo(x, bottom); ctx.lineTo(x + CELL_W, bottom); ctx.lineTo(x + CELL_W, -40); ctx.stroke();
    // cut-line guide
    ctx.setLineDash([8, 6]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(33,26,22,0.55)';
    ctx.beginPath(); ctx.moveTo(x - 30, CUT_Y); ctx.lineTo(x + CELL_W + 30, CUT_Y); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(33,26,22,0.6)'; ctx.font = `600 14px ${FONT_MONO}`; ctx.fillText('CUT', x + CELL_W + 36, CUT_Y + 5);
    ctx.restore();
    void fed;
  }

  function drawFallingPieces(ctx, t) {
    const u = eraLocal(t, 0);
    SNIPS.forEach((sn, n) => {
      const d = u - sn;
      if (d < 0 || d > 1.3) return;
      const y = CUT_Y + CELL_FH / 2 + 60 * d + 0.5 * 2300 * d * d;
      const x = CELL_X + 50 * d + (n % 2 ? -1 : 1) * 30 * d;
      const rot = (n % 2 ? -1 : 1) * d * 3.2;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      ctx.fillStyle = 'rgba(30,26,22,0.92)'; rr(ctx, -CELL_W / 2, -CELL_FH / 2, CELL_W, CELL_FH, 2); ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
      const gg = ctx.createLinearGradient(0, -CELL_FH / 2, 0, CELL_FH / 2); gg.addColorStop(0, '#e9e4d8'); gg.addColorStop(1, '#9b958a');
      ctx.fillStyle = gg; rr(ctx, -CELL_W / 2 + 18, -CELL_FH / 2 + 8, CELL_W - 36, CELL_FH - 16, 6); ctx.fill();
      ctx.fillStyle = 'rgba(247,236,211,0.85)';
      for (let pp = 0; pp < 4; pp++) { rr(ctx, -CELL_W / 2 + 4, -CELL_FH / 2 + 6 + pp * 29, 9, 16, 3); ctx.fill(); rr(ctx, CELL_W / 2 - 13, -CELL_FH / 2 + 6 + pp * 29, 9, 16, 3); ctx.fill(); }
      ctx.restore();
    });
    // "snip!" pop
    SNIPS.forEach((sn) => {
      const d = u - sn;
      if (d < 0 || d > 0.5) return;
      const k = easeOutBack(d / 0.18), a = 1 - smooth((d - 0.3) / 0.2);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(CELL_X + 110, CUT_Y - 50 - d * 40); ctx.rotate(-0.15); ctx.scale(k, k);
      starN(ctx, 0, 0, 9, 46, 30); inkFill(ctx, CREAM, 4);
      ctx.fillStyle = INK; ctx.font = `28px ${FONT_SCRIPT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('snip!', 0, -2);
      ctx.restore();
    });
  }

  function drawCRT(ctx, t) {
    const u = eraLocal(t, 2);
    if (u < -0.8 || u > 5.3) return;
    const drop = clamp((u + 0.45) / 0.55);
    const fall = drop < 1 ? -(1 - drop * drop) * 700 : 0;
    const land = u > 0.1 && u < 0.6 ? Math.exp(-7 * (u - 0.1)) * Math.sin((u - 0.1) * 26) * 0.12 : 0;
    const exit = easeInBack(clamp((u - 4.35) / 0.6));
    const cx = CRT_X, base = GROUND;
    ctx.save();
    ctx.translate(cx, base + fall - exit * 820);
    ctx.scale(1 + land, 1 - land);
    // stand
    rr(ctx, -90, -26, 180, 26, 8); inkFill(ctx, '#bdb19a', 5);
    rr(ctx, -40, -46, 80, 24, 6); inkFill(ctx, '#cfc4ad', 5);
    // casing (chunky, with a deep back)
    rr(ctx, -150, -330, 300, 50, 18); inkFill(ctx, '#b3a78f', 5);
    rr(ctx, -186, -318, 372, 280, 30); inkFill(ctx, '#e4dac3', 6);
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; rr(ctx, -186, -80, 372, 42, 20); ctx.fill();
    // screen
    const sx = -150, sy = -292, sw = 262, sh = 206;
    rr(ctx, sx - 10, sy - 10, sw + 20, sh + 20, 26); inkFill(ctx, '#6d6656', 4);
    rr(ctx, sx, sy, sw, sh, 22); ctx.fillStyle = '#0d2b30'; ctx.fill();
    ctx.save(); rr(ctx, sx, sy, sw, sh, 22); ctx.clip();
    // editor UI
    const on = clamp((u - 0.2) / 0.3);
    ctx.globalAlpha = on;
    ctx.fillStyle = '#123e45'; ctx.fillRect(sx, sy, sw, 34);
    ctx.fillStyle = '#6ff2d8'; ctx.font = `bold 14px ${FONT_MONO}`; ctx.textBaseline = 'middle';
    ctx.fillText('EDIT.EXE  00:0' + Math.floor(clamp(u, 0, 4.99) + 1) + ':' + String(Math.floor(wrap(u * 30, 30))).padStart(2, '0'), sx + 14, sy + 17);
    // preview window
    ctx.fillStyle = '#0a1a1d'; ctx.fillRect(sx + 14, sy + 42, 110, 64);
    const hue = Math.floor(clamp(u, 0, 5) * 2) % 3;
    ctx.fillStyle = ['#ff5ca8', '#ffd84a', '#4fd6ff'][hue]; ctx.beginPath(); ctx.arc(sx + 69, sy + 74, 18, 0, TAU); ctx.fill();
    ctx.fillStyle = '#6ff2d8'; ctx.font = `bold 11px ${FONT_MONO}`; ctx.fillText('▶ PREVIEW', sx + 134, sy + 52);
    ctx.fillText('FX: WIPE', sx + 134, sy + 70); ctx.fillText('24 FPS', sx + 134, sy + 88);
    // tracks
    const rows = [{ n: 'V2', y: sy + 118 }, { n: 'V1', y: sy + 146 }, { n: 'A1', y: sy + 174 }];
    const tx0 = sx + 38, tw = sw - 50;
    rows.forEach((r) => { ctx.fillStyle = '#16474f'; ctx.fillRect(tx0, r.y, tw, 22); ctx.fillStyle = '#6ff2d8'; ctx.font = `bold 11px ${FONT_MONO}`; ctx.fillText(r.n, sx + 12, r.y + 11); });
    const nTaps = TAPS.filter((tp) => u >= tp).length;
    const clips = [
      { r: 0, a: 0.05, b: 0.32, c: '#ff5ca8' }, { r: 0, a: 0.55, b: 0.8, c: '#ff5ca8' },
      { r: 1, a: 0.0, b: 0.22, c: '#ffd84a' }, { r: 1, a: 0.22, b: 0.45, c: '#ffb13b', tap: 1 }, { r: 1, a: 0.45, b: 0.62, c: '#ffd84a', tap: 2 },
      { r: 1, a: 0.62, b: 0.84, c: '#ffb13b', tap: 3 }, { r: 1, a: 0.84, b: 1.0, c: '#ffd84a', tap: 5 }, { r: 0, a: 0.34, b: 0.52, c: '#b77dff', tap: 4 },
    ];
    clips.forEach((cl) => {
      let yo = 0;
      if (cl.tap) { if (nTaps < cl.tap) return; const d = u - TAPS[cl.tap - 1]; yo = -(1 - easeOutBack(d / 0.25)) * 26; }
      ctx.fillStyle = cl.c; rr(ctx, tx0 + cl.a * tw + 1, rows[cl.r].y + 2 + yo, (cl.b - cl.a) * tw - 2, 18, 4); ctx.fill();
    });
    ctx.strokeStyle = '#4fd6ff'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let i = 0; i < tw; i += 3) { const a = 7 * Math.abs(Math.sin(i * 0.21) * Math.sin(i * 0.05 + 1)); ctx.moveTo(tx0 + i, rows[2].y + 11 - a); ctx.lineTo(tx0 + i, rows[2].y + 11 + a); }
    ctx.stroke();
    const ph = tx0 + tw * clamp((u - 0.3) / 4.0);
    ctx.fillStyle = '#ff4040'; ctx.fillRect(ph - 1.5, sy + 112, 3, 90); ctx.beginPath(); ctx.moveTo(ph - 7, sy + 110); ctx.lineTo(ph + 7, sy + 110); ctx.lineTo(ph, sy + 118); ctx.fill();
    // tap ripples
    TAPS.forEach((tp) => { const d = u - tp; if (d < 0 || d > 0.45) return; ctx.strokeStyle = `rgba(111,242,216,${1 - d / 0.45})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(sx + 24 - cx + CRT_X, sy + 150, 8 + d * 90, 0, TAU); ctx.stroke(); });
    ctx.globalAlpha = 1;
    // scanlines + glass
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; for (let yy = sy; yy < sy + sh; yy += 4) ctx.fillRect(sx, yy, sw, 2);
    const glass = ctx.createRadialGradient(sx + sw / 2, sy + sh / 2, 40, sx + sw / 2, sy + sh / 2, 190);
    glass.addColorStop(0, 'rgba(111,242,216,0.08)'); glass.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = glass; ctx.fillRect(sx, sy, sw, sh);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.ellipse(sx + 70, sy + 40, 70, 22, -0.35, 0, TAU); ctx.fill();
    ctx.restore();
    rr(ctx, sx, sy, sw, sh, 22); ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke();
    // side controls
    ctx.beginPath(); ctx.arc(144, -250, 13, 0, TAU); inkFill(ctx, '#9d937c', 4);
    ctx.beginPath(); ctx.arc(144, -206, 13, 0, TAU); inkFill(ctx, '#9d937c', 4);
    ctx.fillStyle = INK; for (let i = 0; i < 4; i++) rr(ctx, 130, -170 + i * 14, 28, 6, 3), ctx.fill();
    const led = Math.floor(wrap(t, DUR) * 2) % 2 === 0;
    ctx.beginPath(); ctx.arc(144, -92, 7, 0, TAU); inkFill(ctx, led ? '#5dff8a' : '#2d7a45', 3);
    ctx.fillStyle = 'rgba(33,26,22,0.7)'; ctx.font = `12px ${FONT_SLAB}`; ctx.textAlign = 'left'; ctx.fillText('VIDEOTRON', -150, -60);
    ctx.restore();
  }

  // 1920s: hand-cranked camera on a tripod, filming the mascot
  function drawCamera(ctx, t) {
    const u = eraLocal(t, 0);
    if (u < -0.8 || u > 5.3) return;
    const drop = clamp((u + 0.35) / 0.55);
    const fall = drop < 1 ? -(1 - drop * drop) * 760 : 0;
    const land = u > 0.2 && u < 0.7 ? Math.exp(-7 * (u - 0.2)) * Math.sin((u - 0.2) * 26) * 0.1 : 0;
    const exit = easeInBack(clamp((u - 4.25) / 0.6));
    const bx = 1500;
    ctx.save();
    ctx.translate(bx, GROUND + fall - exit * 900);
    ctx.scale(1 + land, 1 - land);
    ctx.translate(-bx, -GROUND);
    ctx.lineCap = 'round';
    [[1400, 0], [1600, 0], [1520, 0]].forEach(([fx], i) => {
      ctx.strokeStyle = INK; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(bx, 470); ctx.lineTo(fx, GROUND - 4); ctx.stroke();
      ctx.strokeStyle = i === 2 ? '#6a3f22' : '#8a5530'; ctx.lineWidth = 8; ctx.stroke();
    });
    const crank = TAU * (t / DUR) * 30;
    // reels on top (Mickey ears)
    [[1452, 318, 1], [1560, 322, 0.9]].forEach(([rx, ry, sc], i) => {
      ctx.beginPath(); ctx.arc(rx, ry, 52 * sc, 0, TAU); inkFill(ctx, '#3a2d25', 5);
      for (let h = 0; h < 5; h++) { const a = crank * 0.5 * (i ? 1.2 : 1) + (h * TAU) / 5; ctx.beginPath(); ctx.arc(rx + Math.cos(a) * 30 * sc, ry + Math.sin(a) * 30 * sc, 10 * sc, 0, TAU); inkFill(ctx, '#d9c9a8', 3); }
      ctx.beginPath(); ctx.arc(rx, ry, 8, 0, TAU); inkFill(ctx, BRASS, 3);
    });
    // body
    rr(ctx, 1412, 358, 176, 124, 14); inkFill(ctx, '#8b5a33', 6);
    rr(ctx, 1426, 372, 148, 96, 8); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(33,26,22,0.45)'; ctx.stroke();
    ctx.fillStyle = BRASS; ctx.fillRect(1412, 406, 176, 10); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(1412, 406, 176, 10);
    ctx.fillStyle = CREAM; ctx.font = `14px ${FONT_SLAB}`; ctx.textAlign = 'center'; ctx.fillText('CINÉ-O-MATIC', 1500, 450);
    // lens pointing at the mascot
    rr(ctx, 1352, 390, 64, 50, 6); inkFill(ctx, '#3a2d25', 5);
    ctx.beginPath(); ctx.ellipse(1348, 415, 14, 30, 0, 0, TAU); inkFill(ctx, '#2a4a5a', 5);
    ctx.beginPath(); ctx.ellipse(1344, 404, 4, 9, 0, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill();
    // crank
    const hx = 1602, hy = 420, kx = hx + Math.cos(crank) * 30, ky = hy + Math.sin(crank) * 30;
    ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.stroke();
    ctx.strokeStyle = BRASS; ctx.lineWidth = 4; ctx.stroke();
    ctx.beginPath(); ctx.arc(hx, hy, 9, 0, TAU); inkFill(ctx, BRASS, 3.5);
    ctx.beginPath(); ctx.arc(kx, ky, 10, 0, TAU); inkFill(ctx, '#3a2d25', 3.5);
    ctx.restore();
  }

  // 1960s: tricolour jump-cut cards, one per hop
  const JUMP_WORDS = [
    { w: 'JUMP', x: 1290, y: 190, r: -0.07, c: '#d8392f' },
    { w: 'CUT', x: 1600, y: 290, r: 0.06, c: CREAM },
    { w: 'JUMP', x: 1330, y: 400, r: 0.04, c: '#f3c233' },
    { w: 'CUT!', x: 1620, y: 500, r: -0.05, c: '#d8392f' },
  ];
  function drawJumpWords(ctx, t) {
    const u = eraLocal(t, 1);
    if (u < 0.5 || u > 5.3) return;
    const exit = easeInBack(clamp((u - 4.4) / 0.5));
    const step = Math.floor(u); // jump-cut: layout snaps each hop
    JUMP_WORDS.forEach((jw, i) => {
      const d = u - (1 + i);
      if (d < 0) return;
      const k = easeOutBack(d / 0.3, 2.4) * (1 - exit);
      if (k < 0.01) return;
      const jx = (hash(step * 7 + i) - 0.5) * 18, jy = (hash(step * 13 + i) - 0.5) * 12;
      ctx.save();
      ctx.translate(jw.x + jx, jw.y + jy); ctx.rotate(jw.r + (hash(step + i * 3) - 0.5) * 0.06); ctx.scale(k, k);
      ctx.font = `120px ${FONT_SLAB}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.fillStyle = 'rgba(15,20,40,0.45)'; ctx.fillText(jw.w, 10, 12);
      ctx.lineWidth = 12; ctx.strokeStyle = INK; ctx.strokeText(jw.w, 0, 0);
      ctx.fillStyle = jw.c; ctx.fillText(jw.w, 0, 0);
      ctx.restore();
    });
  }

  function drawFin(ctx, t) {
    const u = eraLocal(t, 3);
    if (u < 0 || u > 5.2) return;
    const pop = easeOutBack(clamp((u - 0.35) / 0.6), 2.2);
    const out = easeInBack(clamp((u - 4.35) / 0.5), 1.6);
    const k = pop * (1 - out);
    if (k < 0.005) return;
    const bob = 6 * Math.sin(TAU * u * 0.8);
    ctx.save();
    ctx.translate(1340, 360 + bob); ctx.rotate(-0.06 + 0.03 * Math.sin(TAU * u * 0.4) + out * 0.5); ctx.scale(k, k);
    // starburst badge
    ctx.save(); ctx.rotate(u * 0.25);
    starN(ctx, 0, 0, 16, 250, 212); inkFill(ctx, '#e2a83b', 6);
    ctx.restore();
    ctx.beginPath(); ctx.ellipse(0, 0, 228, 168, 0, 0, TAU); inkFill(ctx, '#f7ecd3', 6);
    ctx.beginPath(); ctx.ellipse(0, 0, 212, 152, 0, 0, TAU); ctx.lineWidth = 2.5; ctx.setLineDash([3, 7]); ctx.strokeStyle = INK; ctx.stroke(); ctx.setLineDash([]);
    // lettering
    ctx.font = `170px ${FONT_SCRIPT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.fillStyle = '#c95b1c'; ctx.fillText('fin.', 8, -2);
    ctx.lineWidth = 12; ctx.strokeStyle = INK; ctx.strokeText('fin.', 0, -10);
    ctx.fillStyle = ORANGE; ctx.fillText('fin.', 0, -10);
    // swash drawing itself on
    const draw = clamp((u - 0.8) / 0.7);
    ctx.save();
    ctx.beginPath(); ctx.moveTo(-150, 88); ctx.bezierCurveTo(-60, 120, 60, 60, 170, 80); ctx.bezierCurveTo(200, 86, 196, 104, 172, 100);
    ctx.setLineDash([520 * draw, 1000]); ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke();
    ctx.restore();
    ctx.restore();
    // twinkles
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + 0.4, rad = 300 + 30 * (i % 2);
      const tw = Math.max(0, Math.sin(TAU * (u * 0.9 + i * 0.37)));
      const sx = 1340 + Math.cos(a) * rad * 1.1, sy = 360 + Math.sin(a) * rad * 0.72;
      ctx.save(); ctx.globalAlpha = k * tw; star4(ctx, sx, sy, 16 + 10 * tw, 0.22, u); inkFill(ctx, '#f4cd6c', 0); ctx.restore();
    }
  }

  // ---------- captions & scrubber ----------
  function drawEraLabels(ctx, t, w) {
    for (let k = 0; k < 4; k++) {
      if (w[k] < 0.01) continue;
      const u = eraLocal(t, k);
      const inK = easeOutBack(clamp((u + 0.2) / 0.6)), outK = smooth((u - 4.5) / 0.5);
      ctx.save();
      ctx.globalAlpha = clamp(w[k] * 1.5) * (1 - outK);
      ctx.translate(128, 150 - (1 - inK) * 40 + outK * 20);
      ctx.rotate(-0.04);
      // ribbon banner
      ctx.beginPath(); ctx.moveTo(-18, -44); ctx.lineTo(292, -44); ctx.lineTo(270, 0); ctx.lineTo(292, 44); ctx.lineTo(-18, 44); ctx.lineTo(4, 0); ctx.closePath();
      inkFill(ctx, CREAM, 5);
      ctx.fillStyle = INK; ctx.font = `50px ${FONT_SLAB}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      ctx.fillText(ERAS[k].label, 26, 2);
      ctx.fillStyle = rgba(ERAS[k].text); ctx.font = `20px ${FONT_SLAB}`;
      ctx.fillText(ERAS[k].sub, 0, 72);
      ctx.restore();
    }
  }

  function drawScrubber(ctx, t, w) {
    const x0 = 180, x1 = W - 300, y = 998, tc = blendC(w, 'text');
    const pos = wrap(t, DUR) / DUR;
    ctx.save();
    // era segments
    for (let k = 0; k < 4; k++) {
      const a = x0 + ((x1 - x0) * k) / 4, b = x0 + ((x1 - x0) * (k + 1)) / 4;
      rr(ctx, a + 3, y - 9, b - a - 6, 18, 9); inkFill(ctx, rgba(k === 3 ? hex('#3b4b86') : ERAS[k].paper), 4);
      ctx.fillStyle = rgba(tc, 0.9); ctx.font = `17px ${FONT_SLAB}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(ERAS[k].label, a + 8, y - 22);
    }
    // ticks per second
    ctx.strokeStyle = rgba(tc, 0.6); ctx.lineWidth = 2;
    for (let s = 0; s <= 20; s++) { const x = x0 + ((x1 - x0) * s) / 20; ctx.beginPath(); ctx.moveTo(x, y + 16); ctx.lineTo(x, y + (s % 5 ? 23 : 30)); ctx.stroke(); }
    // played portion
    ctx.save(); rr(ctx, x0 + 3, y - 9, (x1 - x0) * pos, 18, 9); ctx.clip();
    ctx.fillStyle = 'rgba(247,236,211,0.45)'; ctx.fillRect(x0, y - 9, x1 - x0, 18);
    ctx.restore();
    // playhead
    const px = x0 + (x1 - x0) * pos;
    ctx.fillStyle = INK; ctx.fillRect(px - 2, y - 40, 4, 44);
    ctx.beginPath(); ctx.moveTo(px - 14, y - 52); ctx.lineTo(px + 14, y - 52); ctx.lineTo(px + 14, y - 40); ctx.lineTo(px, y - 28); ctx.lineTo(px - 14, y - 40); ctx.closePath(); inkFill(ctx, ORANGE, 3.5);
    ctx.beginPath(); ctx.arc(px, y, 13, 0, TAU); inkFill(ctx, CREAM, 4);
    // transport + timecode
    const tt = wrap(t, DUR);
    ctx.fillStyle = rgba(tc); ctx.font = `600 26px ${FONT_MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('00:' + String(Math.floor(tt)).padStart(2, '0') + ':' + String(Math.floor((tt % 1) * 30)).padStart(2, '0'), x1 + 36, y + 2);
    ctx.beginPath(); ctx.moveTo(x0 - 70, y - 14); ctx.lineTo(x0 - 44, y); ctx.lineTo(x0 - 70, y + 14); ctx.closePath(); inkFill(ctx, CREAM, 3.5);
    ctx.lineWidth = 4; ctx.strokeStyle = rgba(tc); ctx.beginPath(); ctx.arc(x0 - 112, y, 14, 0.4, TAU - 0.2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0 - 104, y - 20); ctx.lineTo(x0 - 96, y - 12); ctx.lineTo(x0 - 107, y - 7); ctx.fillStyle = rgba(tc); ctx.fill();
    ctx.restore();
  }

  // ---------- compositor ----------
  function drawFrame(ctx, t) {
    t = wrap(t, DUR);
    if (!GRAIN) buildGrain();
    const w = eraWeights(t);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawBackground(ctx, t, w);
    drawGuides(ctx, t, w);
    drawFin(ctx, t);
    drawJumpWords(ctx, t);
    drawCelluloid(ctx, t);
    drawStrip(ctx, t, w);
    drawSplices(ctx, t);
    drawCRT(ctx, t);
    drawCamera(ctx, t);
    drawMascot(ctx, t, w);
    drawFallingPieces(ctx, t);
    drawEraLabels(ctx, t, w);
    drawScrubber(ctx, t, w);
    // tactile paper grain, boiling on twos at 12 fps
    const step = Math.floor(t * 12) % 3;
    const offs = [[0, 0], [11, 7], [5, 17]][step];
    ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.42;
    ctx.drawImage(GRAIN, -offs[0], -offs[1]);
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 1;
    const vg = ctx.createRadialGradient(W / 2, H / 2, 420, W / 2, H / 2, 1250);
    vg.addColorStop(0, 'rgba(255,255,255,1)'); vg.addColorStop(1, 'rgba(150,130,110,1)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }

  window.FilmstripLoop = { W, H, DUR, drawFrame };
})();
