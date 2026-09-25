// "The Cut" — a 20 s history of film editing. drawFrame(ctx, t) is a pure function of time.
(function () {
  'use strict';

  const W = 1920, H = 1080, DUR = 20, TAU = Math.PI * 2;

  // ---------- math ----------
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  const easeOutBack = (x, s = 1.7) => { x = clamp(x); const c = s + 1; return 1 + c * (x - 1) ** 3 + s * (x - 1) ** 2; };
  const easeInBack = (x, s = 1.7) => { x = clamp(x); return (s + 1) * x ** 3 - s * x ** 2; };
  const easeOut = (x) => 1 - (1 - clamp(x)) ** 3;
  const easeIn = (x) => clamp(x) ** 3;
  const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  function mulberry32(a) {
    return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  // ---------- palette & type ----------
  const PAPER = '#efe6d2', INK = '#161514', RED = '#d7261e', OCHRE = '#e3a21a', TEAL = '#2b6e6e', BLUE = '#1f3f8f', CHAR = '#1b1d21';
  const SKIN = '#f3d9b8';
  const FT = '"Bebas Neue", "Arial Narrow", sans-serif';
  const FM = '"JetBrains Mono", "DejaVu Sans Mono", monospace';

  // ---------- cut-paper shapes (edges boil at 8 fps) ----------
  let BOIL = 0;
  const jit = (i, seed, amp) => (hash(seed * 13.7 + i * 7.13 + BOIL * 3.31) - 0.5) * 2 * amp;
  function roughPoly(g, pts, seed = 1, amp = 2) {
    g.beginPath();
    pts.forEach(([x, y], i) => { const X = x + jit(i, seed, amp), Y = y + jit(i + 57, seed, amp); i ? g.lineTo(X, Y) : g.moveTo(X, Y); });
    g.closePath();
  }
  function roughRect(g, x, y, w, h, seed = 1, amp = 2) {
    const pts = [], n = (a) => Math.max(1, Math.round(a / 90));
    const nx = n(w), ny = n(h);
    for (let i = 0; i < nx; i++) pts.push([x + (w * i) / nx, y]);
    for (let i = 0; i < ny; i++) pts.push([x + w, y + (h * i) / ny]);
    for (let i = 0; i < nx; i++) pts.push([x + w - (w * i) / nx, y + h]);
    for (let i = 0; i < ny; i++) pts.push([x, y + h - (h * i) / ny]);
    roughPoly(g, pts, seed, amp);
  }
  function roughEllipse(g, x, y, rx, ry, seed = 1, amp = 1.6, n = 34) {
    const pts = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU; pts.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry]); }
    roughPoly(g, pts, seed, amp);
  }
  const roughCircle = (g, x, y, r, seed, amp, n) => roughEllipse(g, x, y, r, r, seed, amp, n);
  function fill(g, c) { g.fillStyle = c; g.fill(); }
  function rr(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function starN(g, x, y, n, r1, r2, rot = 0) {
    g.beginPath();
    for (let i = 0; i < n * 2; i++) { const a = rot + (i * Math.PI) / n; const r = i % 2 ? r2 : r1; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    g.closePath();
  }

  // ---------- shot artwork, authored at 320×240 (4:3) ----------
  const ART = {
    train(g, u, p) {
      g.fillStyle = '#dcd8ce'; g.fillRect(-400, -100, 1120, 440);
      const hy = 100; g.fillStyle = '#a8a49b'; g.fillRect(-400, hy, 1120, 300);
      const vp = { x: 205, y: hy };
      g.fillStyle = '#6e6b64'; g.beginPath(); g.moveTo(vp.x + 10, hy - 12); g.lineTo(340, hy - 56); g.lineTo(340, hy - 40); g.lineTo(vp.x + 10, hy - 8); g.fill();
      g.fillStyle = '#c4c0b6'; g.beginPath(); g.moveTo(vp.x + 6, hy); g.lineTo(340, hy + 4); g.lineTo(340, 250); g.lineTo(245, 250); g.closePath(); g.fill();
      g.strokeStyle = '#4a4843'; g.lineWidth = 2.5;
      [30, 150].forEach((bx) => { g.beginPath(); g.moveTo(vp.x, vp.y); g.lineTo(bx, 250); g.stroke(); });
      for (let i = 1; i < 8; i++) { const f = (i / 8) ** 2; g.lineWidth = 1 + f * 3; g.beginPath(); g.moveTo(lerp(vp.x, 20, f), lerp(vp.y, 250, f)); g.lineTo(lerp(vp.x, 170, f), lerp(vp.y, 250, f)); g.stroke(); }
      const S = lerp(0.05, 1.12, p * p), q = clamp(S / 1.12);
      const bx = lerp(vp.x, 90, q), by = lerp(vp.y, 262, q), fh = 150 * S, fw = 112 * S;
      g.fillStyle = '#2b2a27'; g.beginPath(); g.moveTo(bx + fw / 2, by - fh); g.lineTo(vp.x + 2, vp.y - 7); g.lineTo(vp.x + 2, vp.y); g.lineTo(bx + fw / 2, by); g.fill();
      g.fillStyle = 'rgba(244,241,232,0.9)';
      for (let i = 0; i < 6; i++) {
        const f = (i + ((u * 1.6) % 1)) / 6;
        g.beginPath(); g.arc(lerp(bx, vp.x + 30, f) + Math.sin(i * 2 + u) * 6, lerp(by - fh * 1.2, vp.y - 40, f), lerp(fw * 0.32, 5, f), 0, TAU); g.fill();
      }
      g.fillStyle = '#141412'; g.fillRect(bx - fw / 2, by - fh, fw, fh);
      g.fillRect(bx - fw * 0.12, by - fh * 1.25, fw * 0.24, fh * 0.28);
      g.fillStyle = '#3c3a36'; g.beginPath(); g.moveTo(bx - fw * 0.58, by); g.lineTo(bx + fw * 0.58, by); g.lineTo(bx, by - fh * 0.25); g.fill();
      g.strokeStyle = '#3c3a36'; g.lineWidth = Math.max(1, fw * 0.05); g.beginPath(); g.arc(bx, by - fh * 0.5, fw * 0.3, 0, TAU); g.stroke();
      g.fillStyle = '#f4f1e8'; g.beginPath(); g.arc(bx, by - fh * 0.78, fw * 0.14, 0, TAU); g.fill();
    },
    bandit(g, u) {
      g.fillStyle = '#b9b5ab'; g.fillRect(-400, -100, 1120, 440);
      g.fillStyle = '#8f8b82'; g.fillRect(-400, 170, 1120, 200);
      g.fillStyle = '#1d1c1a'; g.beginPath(); g.moveTo(70, 250); g.lineTo(108, 150); g.lineTo(212, 150); g.lineTo(250, 250); g.fill();
      g.fillStyle = '#e0dbcf'; g.beginPath(); g.ellipse(160, 108, 32, 40, 0, 0, TAU); g.fill();
      g.fillStyle = '#1d1c1a'; g.beginPath(); g.ellipse(160, 74, 74, 12, 0, 0, TAU); g.fill(); rr(g, 126, 28, 68, 48, 14); g.fill();
      g.fillRect(146, 118, 28, 6); g.fillRect(146, 96, 6, 5); g.fillRect(168, 96, 6, 5);
      // revolver aimed at the audience
      g.fillStyle = '#e0dbcf'; g.beginPath(); g.arc(214, 170, 30, 0, TAU); g.fill();
      g.fillStyle = '#1d1c1a'; g.beginPath(); g.arc(214, 160, 19, 0, TAU); g.fill();
      g.fillStyle = '#6a6760'; g.beginPath(); g.arc(214, 160, 8, 0, TAU); g.fill();
      if (Math.floor(u * 4) % 2 === 0) { starN(g, 214, 160, 9, 58, 26, u); g.fillStyle = '#e0452b'; g.fill(); starN(g, 214, 160, 7, 30, 14); g.fillStyle = '#f6c14a'; g.fill(); }
    },
    face(g) {
      g.fillStyle = '#b3afa5'; g.fillRect(-400, -100, 1120, 440);
      g.fillStyle = '#2a2927'; g.beginPath(); g.moveTo(40, 250); g.quadraticCurveTo(60, 180, 160, 176); g.quadraticCurveTo(260, 180, 280, 250); g.fill();
      g.fillStyle = '#d4cec2'; g.fillRect(142, 150, 36, 36);
      g.fillStyle = '#dcd6ca'; g.beginPath(); g.ellipse(160, 108, 50, 64, 0, 0, TAU); g.fill();
      g.fillStyle = '#2a2927'; g.beginPath(); g.ellipse(160, 60, 54, 30, 0, Math.PI, TAU); g.fill(); g.fillRect(106, 56, 108, 12);
      g.fillRect(128, 88, 22, 4); g.fillRect(170, 88, 22, 4);
      g.beginPath(); g.ellipse(139, 102, 5, 4, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(181, 102, 5, 4, 0, 0, TAU); g.fill();
      g.fillStyle = '#b8b1a4'; g.beginPath(); g.moveTo(160, 104); g.lineTo(152, 130); g.lineTo(166, 132); g.fill();
      g.fillStyle = '#2a2927'; g.fillRect(146, 146, 28, 3.5);
    },
    soup(g, u) {
      g.fillStyle = '#cfcbc1'; g.fillRect(-400, -100, 1120, 440);
      g.fillStyle = '#a9a59b'; g.beginPath(); g.ellipse(160, 175, 150, 50, 0, 0, TAU); g.fill();
      g.fillStyle = '#2b2a27'; g.beginPath(); g.ellipse(160, 150, 84, 50, 0, 0, Math.PI); g.fill();
      g.fillStyle = '#e6e1d6'; g.beginPath(); g.ellipse(160, 150, 84, 18, 0, 0, TAU); g.fill();
      g.fillStyle = '#8c8577'; g.beginPath(); g.ellipse(160, 151, 72, 13, 0, 0, TAU); g.fill();
      g.fillStyle = '#3a3935'; g.save(); g.translate(236, 140); g.rotate(-0.5); g.fillRect(-4, -60, 8, 70); g.beginPath(); g.ellipse(0, 14, 12, 18, 0, 0, TAU); g.fill(); g.restore();
      g.strokeStyle = 'rgba(245,242,235,0.85)'; g.lineWidth = 5; g.lineCap = 'round';
      [-30, 0, 30].forEach((dx, i) => { g.beginPath(); for (let k = 0; k <= 10; k++) { const yy = 128 - k * 9; const xx = 160 + dx + Math.sin(k * 0.8 + u * 6 + i) * 8; k ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.stroke(); });
    },
    coffin(g) {
      g.fillStyle = '#9d998f'; g.fillRect(-400, -100, 1120, 440);
      g.fillStyle = '#1d1c1a'; g.beginPath(); [[134, 30], [186, 30], [214, 86], [196, 222], [124, 222], [106, 86]].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.fill();
      g.strokeStyle = '#55524c'; g.lineWidth = 3; g.beginPath(); [[138, 42], [182, 42], [202, 88], [188, 210], [132, 210], [118, 88]].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.stroke();
      g.fillStyle = '#d9d4c8'; g.fillRect(156, 70, 8, 60); g.fillRect(140, 88, 40, 8);
      g.fillStyle = '#e6e1d6'; [[60, 190], [260, 190]].forEach(([x, y]) => { g.fillRect(x - 6, y - 60, 12, 60); g.beginPath(); g.ellipse(x, y - 70, 5, 10, 0, 0, TAU); g.fill(); });
    },
    moviola(g, u) {
      g.fillStyle = OCHRE; g.fillRect(-400, -100, 1120, 440);
      [[110, 70, 1], [220, 80, -1]].forEach(([x, y, d]) => { g.fillStyle = INK; g.beginPath(); g.arc(x, y, 52, 0, TAU); g.fill(); g.fillStyle = OCHRE; for (let i = 0; i < 3; i++) { const a = u * 5 * d + (i * TAU) / 3; g.beginPath(); g.arc(x + Math.cos(a) * 28, y + Math.sin(a) * 28, 13, 0, TAU); g.fill(); } });
      g.fillStyle = INK; g.fillRect(90, 120, 150, 60); g.fillRect(150, 180, 30, 60);
      g.fillStyle = '#f4e6b8'; g.fillRect(104, 132, 70, 40);
    },
    jump(g, u) {
      g.fillStyle = RED; g.fillRect(-400, -100, 1120, 440);
      g.fillStyle = PAPER; g.beginPath(); g.arc(190, 110, 90, 0, TAU); g.fill();
      g.save(); g.translate(180, 120); g.scale(0.36, 0.36); drawMan(g, u); g.restore();
    },
    tape(g, u) {
      g.fillStyle = TEAL; g.fillRect(-400, -100, 1120, 440);
      const bars = ['#e8e8e8', '#e8e800', '#00e8e8', '#00e800', '#e800e8', '#e80000', '#0000e8'];
      bars.forEach((c, i) => { g.fillStyle = c; g.fillRect(40 + i * 34.3, 40, 34.3, 110); });
      g.fillStyle = INK; g.fillRect(40, 150, 240, 50);
      g.fillStyle = PAPER; g.font = `bold 22px ${FM}`; g.fillText('01:00:' + String(10 + Math.floor(u)).padStart(2, '0') + ':' + String(Math.floor((u * 30) % 30)).padStart(2, '0'), 58, 184);
    },
    phone(g) {
      g.fillStyle = BLUE; g.fillRect(-400, -100, 1120, 440);
      g.fillStyle = INK; rr(g, 120, 30, 80, 170, 14); g.fill(); g.fillStyle = PAPER; g.fillRect(128, 50, 64, 110);
    },
  };
  function art(g, key, x, y, w, h, u = 0, p = 1) {
    g.save();
    g.beginPath(); g.rect(x, y, w, h); g.clip();
    const k = Math.max(w / 320, h / 240);
    g.translate(x + (w - 320 * k) / 2, y + (h - 240 * k) / 2); g.scale(k, k);
    ART[key](g, u, p);
    g.restore();
  }

  // 1960: fedora, profile facing left, cigarette. Origin at the head centre, ~600 px tall.
  function drawMan(g, u) {
    g.fillStyle = INK;
    roughPoly(g, [[-260, 420], [-210, 270], [-70, 240], [-40, 170], [-20, 128], [-90, 96], [-106, 62], [-98, 50], [-108, 38], [-100, 22], [-138, 6], [-98, -40],
      [-70, -100], [40, -110], [96, -40], [92, 40], [60, 120], [58, 190], [210, 260], [250, 420]], 3, 2.5);
    g.fill();
    roughPoly(g, [[-96, -98], [-76, -196], [-10, -214], [76, -200], [100, -100]], 4, 2); g.fill();
    roughPoly(g, [[-190, -92], [-120, -114], [60, -120], [160, -108], [140, -84], [40, -94], [-120, -84]], 5, 2); g.fill();
    g.fillStyle = PAPER;
    roughPoly(g, [[-70, 240], [-38, 176], [-8, 250]], 6, 2); g.fill();
    roughPoly(g, [[-8, 250], [30, 190], [58, 190], [40, 262]], 7, 2); g.fill();
    g.fillStyle = PAPER; g.save(); g.translate(-104, 50); g.rotate(0.12); g.fillRect(-92, -5, 92, 10); g.restore();
    g.fillStyle = OCHRE; g.save(); g.translate(-104, 50); g.rotate(0.12); g.fillRect(-100, -5, 12, 10); g.restore();
    g.strokeStyle = 'rgba(239,230,210,0.85)'; g.lineWidth = 9; g.lineCap = 'round';
    for (let s = 0; s < 2; s++) {
      g.beginPath();
      for (let k = 0; k <= 14; k++) { const yy = 30 - k * 20; const xx = -205 + Math.sin(k * 0.55 - u * 5 + s * 2) * (10 + k * 2.2) - s * 30; k ? g.lineTo(xx, yy) : g.moveTo(xx, yy); }
      g.stroke();
    }
  }

  function drawScissors(g, x, y, open, rot, scale = 1) {
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(scale, scale);
    const a = 0.38 * open;
    [-1, 1].forEach((s) => {
      g.save(); g.rotate(s * a);
      g.fillStyle = INK; roughPoly(g, [[-10 * s, -10], [4 * s, 350], [22 * s, 60], [18 * s, -10]], 11 + s, 1.5); g.fill();
      g.fillStyle = RED; roughEllipse(g, -40 * s, -110, 44, 62, 13 + s, 2); g.fill();
      g.fillStyle = PAPER; roughEllipse(g, -40 * s, -110, 22, 36, 15 + s, 2); g.fill();
      g.fillStyle = RED; roughPoly(g, [[-14 * s, -60], [-30 * s, -60], [-8 * s, 10], [8 * s, 10]], 17 + s, 1.5); g.fill();
      g.restore();
    });
    g.fillStyle = PAPER; g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.fill();
    g.restore();
  }

  // ---------- scenes ----------
  function s1895(g, u) {
    g.fillStyle = INK; g.fillRect(0, 0, W, H);
    const fx = 700, fy = 110, fw = 960, fh = 720;
    const lamp = u < 0.45 ? (hash(Math.floor(u * 24)) > 0.4 ? 1 : 0.15) * smooth(u / 0.1) : 1;
    const gl = g.createRadialGradient(fx + fw / 2, fy + fh / 2, 200, fx + fw / 2, fy + fh / 2, 900);
    gl.addColorStop(0, `rgba(239,230,210,${0.14 * lamp})`); gl.addColorStop(1, 'rgba(239,230,210,0)');
    g.fillStyle = gl; g.fillRect(0, 0, W, H);
    const weave = (hash(Math.floor(u * 18)) - 0.5) * 4;
    art(g, 'train', fx, fy + weave, fw, fh, u, clamp(u / 2.95));
    const step = Math.floor(u * 18);
    g.save(); g.beginPath(); g.rect(fx, fy + weave, fw, fh); g.clip();
    g.fillStyle = `rgba(255,250,235,${0.03 + 0.07 * hash(step)})`; g.fillRect(fx, fy, fw, fh);
    g.strokeStyle = 'rgba(250,245,230,0.5)'; g.lineWidth = 2;
    for (let i = 0; i < 2; i++) { const sx = fx + hash(step * 3 + i) * fw; g.beginPath(); g.moveTo(sx, fy); g.lineTo(sx + 6, fy + fh); g.stroke(); }
    g.fillStyle = 'rgba(15,12,10,0.7)';
    for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(fx + hash(step + i * 11) * fw, fy + hash(step * 5 + i) * fh, 1.5 + hash(i + step) * 3, 0, TAU); g.fill(); }
    const vg = g.createRadialGradient(fx + fw / 2, fy + fh / 2, fh * 0.35, fx + fw / 2, fy + fh / 2, fw * 0.62);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)'); g.fillStyle = vg; g.fillRect(fx, fy, fw, fh);
    g.fillStyle = `rgba(0,0,0,${1 - lamp})`; g.fillRect(fx, fy, fw, fh);
    g.restore();
  }

  function filmBand(g, x0, x1, yc, h, seed) {
    g.fillStyle = INK; roughRect(g, x0, yc - h / 2, x1 - x0, h, seed, 1.5); g.fill();
    g.fillStyle = PAPER;
    for (let x = x0 + 14; x < x1 - 20; x += 42) { rr(g, x, yc - h / 2 + 12, 20, 14, 3); g.fill(); rr(g, x, yc + h / 2 - 26, 20, 14, 3); g.fill(); }
  }
  function sSplice(g, u) {
    g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
    const yc = 500, sh = 250, P = 250, fw = 224, fhh = 168, CX = 960;
    const piece = (x0, n, key, seed, pBase) => {
      filmBand(g, x0, x0 + P * n, yc, sh, seed);
      for (let k = 0; k < n; k++) art(g, key, x0 + k * P + (P - fw) / 2, yc - fhh / 2, fw, fhh, u + k * 0.13, pBase + k * 0.07);
    };
    piece(CX - P * 5, 5, 'train', 21, 0.4);
    const outOff = easeIn((u - 0.45) / 0.25) * 1300;
    if (outOff < 1250) piece(CX + outOff, 5, 'train', 22, 0.75);
    const inOff = (1 - easeOut((u - 0.6) / 0.35)) * 1300 + 30 * (1 - smooth((u - 0.95) / 0.12));
    if (u > 0.6) piece(CX + inOff, 5, 'bandit', 23, 0);
    if (u > 0.37 && u < 0.55) { g.fillStyle = RED; g.fillRect(CX - 4, yc - sh / 2 - 30, 8, sh + 60); }
    // cement drop
    if (u > 0.9) {
      const d = u - 0.9, yy = Math.min(yc - sh / 2 - 6, 250 + 2600 * d * d);
      g.fillStyle = RED;
      if (yy < yc - sh / 2 - 6) { roughEllipse(g, CX, yy, 12, 18, 31, 1); g.fill(); }
      else { roughEllipse(g, CX, yc - sh / 2 - 2, 26 + 10 * easeOut((d - 0.15) / 0.1), 9, 32, 1.5); g.fill(); }
      if (u > 1.08) { g.fillStyle = INK; g.font = `600 24px ${FM}`; g.textAlign = 'center'; g.fillText('SPLICE', CX, yc - sh / 2 - 40); g.textAlign = 'left'; }
    }
    const inY = lerp(-420, 250, easeOutBack(u / 0.3, 1.2)) - easeInBack((u - 0.55) / 0.3) * 900;
    const open = u < 0.3 ? 1 : 1 - smooth((u - 0.3) / 0.07);
    drawScissors(g, CX, inY, open, 0, 1.05);
  }

  function sKuleshov(g, u) {
    g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
    const fy = 330, fw = 460, fh = 345;
    const frame = (x, key, k, seed) => {
      if (k <= 0.01) return;
      g.save(); g.translate(x + fw / 2, fy + fh / 2); g.scale(k, k); g.translate(-(x + fw / 2), -(fy + fh / 2));
      g.fillStyle = INK; roughRect(g, x - 16, fy - 16, fw + 32, fh + 32, seed, 2.5); g.fill();
      art(g, key, x, fy, fw, fh, u, 1);
      g.restore();
    };
    frame(190, 'face', 1, 41);
    const sym = (txt, x, k) => { if (k <= 0) return; g.save(); g.translate(x, fy + fh / 2 + 10); g.scale(k, k); g.fillStyle = INK; g.font = `150px ${FT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 0, 0); g.restore(); };
    sym('+', 735, easeOutBack((u - 0.1) / 0.2));
    const swap = u >= 1.1, ul = swap ? u - 1.1 : u;
    frame(800, swap ? 'coffin' : 'soup', swap ? 1 : easeOutBack((u - 0.14) / 0.22), 42);
    sym('=', 1340, easeOutBack((u - 0.3) / 0.2));
    const wk = easeOutBack((ul - (swap ? 0.05 : 0.42)) / 0.22, 2.5);
    if (wk > 0) {
      g.save(); g.translate(1405, fy + fh / 2 + 12); g.rotate(-0.04); g.scale(wk, wk);
      g.fillStyle = RED; g.font = `170px ${FT}`; g.textBaseline = 'middle'; g.fillText(swap ? 'GRIEF' : 'HUNGER', 0, 0);
      g.restore();
    }
    if (u > 1.3) {
      g.fillStyle = INK; g.font = `600 24px ${FM}`; g.textAlign = 'center';
      g.fillText('▲ SAME SHOT OF THE SAME FACE', 190 + fw / 2, fy + fh + 64); g.textAlign = 'left';
    }
  }

  function ribbon(g, pts, off) {
    const path = () => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); g.bezierCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1], pts[3][0], pts[3][1]); };
    g.lineCap = 'butt';
    path(); g.lineWidth = 92; g.strokeStyle = INK; g.stroke();
    path(); g.lineWidth = 64; g.strokeStyle = PAPER; g.setLineDash([14, 20]); g.lineDashOffset = -off; g.stroke();
    path(); g.lineWidth = 40; g.strokeStyle = INK; g.setLineDash([]); g.stroke();
    path(); g.lineWidth = 34; g.strokeStyle = '#3a3531'; g.setLineDash([46, 8]); g.lineDashOffset = -off; g.stroke(); g.setLineDash([]);
  }
  function sMoviola(g, u) {
    g.fillStyle = OCHRE; g.fillRect(0, 0, W, H);
    ribbon(g, [[1420, 420], [1100, 900], [500, 560], [-60, 780]], u * 240);
    g.fillStyle = 'rgba(0,0,0,0.12)'; roughEllipse(g, 1250, 905, 260, 26, 51, 2); g.fill();
    g.fillStyle = INK;
    roughPoly(g, [[1130, 905], [1370, 905], [1330, 860], [1170, 860]], 52, 2); g.fill();
    roughRect(g, 1218, 560, 64, 310, 53, 2); g.fill();
    roughRect(g, 1320, 866, 70, 18, 54, 1.5); g.fill();
    roughRect(g, 1070, 400, 360, 180, 55, 2.5); g.fill();
    const view = { x: 1110, y: 425, w: 200, h: 130 };
    g.fillStyle = '#f4e6b8'; roughRect(g, view.x, view.y, view.w, view.h, 56, 1.5); g.fill();
    // runner in the viewer, on 12s
    g.save(); g.beginPath(); g.rect(view.x, view.y, view.w, view.h); g.clip();
    const ph = Math.floor(u * 12) * 0.9, rx = view.x + 100, ry = view.y + 60;
    g.strokeStyle = INK; g.lineCap = 'round'; g.lineWidth = 9;
    const limb = (x, y, a, l) => { g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.sin(a) * l, y + Math.cos(a) * l); g.stroke(); };
    limb(rx, ry + 8, Math.sin(ph) * 0.9, 34); limb(rx, ry + 8, -Math.sin(ph) * 0.9, 34);
    limb(rx, ry - 20, -Math.sin(ph) * 1.2 + Math.PI, -28); limb(rx, ry - 20, Math.sin(ph) * 1.2 + Math.PI, -28);
    g.lineWidth = 12; g.beginPath(); g.moveTo(rx, ry - 26); g.lineTo(rx, ry + 10); g.stroke();
    g.fillStyle = INK; g.beginPath(); g.arc(rx, ry - 38, 10, 0, TAU); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(view.x, view.y + 108, view.w, 22);
    g.restore();
    g.fillStyle = RED; roughRect(g, 1340, 440, 60, 110, 57, 2); g.fill();
    g.fillStyle = PAPER; g.font = `24px ${FT}`; g.save(); g.translate(1378, 540); g.rotate(-Math.PI / 2); g.fillText('MOVIOLA', 0, 0); g.restore();
    [[1120, 250, 128, 1], [1420, 300, 112, -1]].forEach(([x, y, r, d], i) => {
      g.fillStyle = INK; roughCircle(g, x, y, r, 60 + i, 2.5, 40); g.fill();
      g.fillStyle = OCHRE;
      for (let k = 0; k < 3; k++) {
        const a = u * 7 * d + (k * TAU) / 3;
        roughPoly(g, [[x + Math.cos(a - 0.45) * r * 0.3, y + Math.sin(a - 0.45) * r * 0.3], [x + Math.cos(a - 0.5) * r * 0.8, y + Math.sin(a - 0.5) * r * 0.8],
          [x + Math.cos(a) * r * 0.86, y + Math.sin(a) * r * 0.86], [x + Math.cos(a + 0.5) * r * 0.8, y + Math.sin(a + 0.5) * r * 0.8], [x + Math.cos(a + 0.45) * r * 0.3, y + Math.sin(a + 0.45) * r * 0.3]], 62 + k, 1.5);
        g.fill();
      }
      g.fillStyle = PAPER; g.beginPath(); g.arc(x, y, 12, 0, TAU); g.fill();
    });
    g.strokeStyle = INK; g.lineWidth = 10;
    g.beginPath(); g.moveTo(1120 + 20, 378); g.lineTo(1150, 402); g.moveTo(1420 - 20, 412); g.lineTo(1390, 402); g.stroke();
  }

  const JUMPS = [[0, 1, 0], [-170, 1.2, 0.8], [110, 0.9, 1.9], [-70, 1.08, 0.3], [170, 0.97, 1.3], [-20, 1.3, 2.4], [80, 1.02, 0.6]];
  function sJump(g, u) {
    g.fillStyle = RED; g.fillRect(0, 0, W, H);
    const i = Math.min(JUMPS.length - 1, Math.floor(u / 0.3));
    const [dx, s, tskip] = JUMPS[i];
    g.fillStyle = PAPER; roughCircle(g, 1260 + dx * 0.4, 470, 370, 71 + i, 3, 48); g.fill();
    g.save(); g.translate(1180 + dx, 520 + (s - 1) * 120); g.scale(s, s); drawMan(g, u + tskip); g.restore();
    g.fillStyle = INK; g.font = `44px ${FT}`; g.save(); g.translate(1805, 300); g.rotate(Math.PI / 2);
    g.fillText('À BOUT DE SOUFFLE', 0, 0); g.restore();
  }

  function tc(frames) {
    const f = Math.floor(frames), ff = f % 30, s = Math.floor(f / 30) % 60, m = Math.floor(f / 1800) % 60;
    return `01:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(ff).padStart(2, '0')}`;
  }
  function sTape(g, u) {
    g.fillStyle = TEAL; g.fillRect(0, 0, W, H);
    const stations = [{ x: 890, label: 'SOURCE' }, { x: 1500, label: 'RECORD' }];
    const EDIT = 1.9, recording = u >= EDIT;
    // tape path between decks
    g.save();
    g.beginPath(); g.moveTo(1030, 560); g.bezierCurveTo(1120, 470, 1270, 470, 1360, 560);
    g.lineWidth = 16; g.strokeStyle = '#4a2f1c'; g.stroke();
    if (recording) { g.setLineDash([18, 16]); g.lineDashOffset = -u * 200; g.lineWidth = 6; g.strokeStyle = OCHRE; g.stroke(); g.setLineDash([]); }
    g.restore();
    stations.forEach((st, si) => {
      const mx = st.x - 220, my = 150, mw = 440, mh = 300;
      g.fillStyle = INK; roughRect(g, mx - 18, my - 18, mw + 36, mh + 36, 81 + si, 2.5); g.fill();
      if (si === 0 || recording) art(g, 'jump', mx, my, mw, mh, u * 1.3 + 0.4, 1);
      else { g.fillStyle = '#0c1616'; g.fillRect(mx, my, mw, mh); g.fillStyle = PAPER; g.font = `600 26px ${FM}`; g.textAlign = 'center'; g.fillText('STANDBY', st.x, my + mh / 2 + 8); g.textAlign = 'left'; }
      g.fillStyle = 'rgba(0,0,0,0.18)'; for (let yy = my; yy < my + mh; yy += 5) g.fillRect(mx, yy, mw, 2);
      if (si === 1 && recording && Math.floor(u * 3) % 2 === 0) { g.fillStyle = RED; g.beginPath(); g.arc(mx + 34, my + 34, 12, 0, TAU); g.fill(); g.fillStyle = PAPER; g.font = `700 22px ${FM}`; g.fillText('REC', mx + 54, my + 42); }
      // deck
      const dy = 520;
      g.fillStyle = PAPER; roughRect(g, st.x - 240, dy, 480, 160, 85 + si, 2); g.fill();
      g.fillStyle = INK; roughRect(g, st.x - 190, dy + 26, 250, 96, 87 + si, 1.5); g.fill();
      [st.x - 130, st.x].forEach((hx, hi) => {
        g.fillStyle = '#e8dfc9'; g.beginPath(); g.arc(hx, dy + 74, 32, 0, TAU); g.fill();
        g.fillStyle = INK; const a = (si === 0 || recording ? u : 0) * 8 * (hi ? 1 : 0.8);
        for (let k = 0; k < 6; k++) { const aa = a + (k * TAU) / 6; g.fillRect(hx + Math.cos(aa) * 20 - 4, dy + 74 + Math.sin(aa) * 20 - 4, 8, 8); }
      });
      const frames = 10 * 30 + (si === 0 ? u * 30 : recording ? (u - EDIT) * 30 : 0);
      g.fillStyle = INK; g.font = `700 22px ${FM}`; g.fillText(tc(frames), st.x + 76, dy + 70);
      g.font = `600 18px ${FM}`; g.fillText(st.label, st.x + 74, dy + 104);
    });
    // edit controller
    const btns = [{ l: 'IN', t: 0.7, c: OCHRE }, { l: 'OUT', t: 1.3, c: OCHRE }, { l: 'EDIT', t: EDIT, c: RED }];
    g.fillStyle = INK; roughRect(g, 1010, 730, 380, 120, 91, 2); g.fill();
    btns.forEach((b, i) => {
      const x = 1036 + i * 118, y = 752, press = Math.max(0, 1 - Math.abs(u - b.t) / 0.08);
      const lit = u >= b.t && (b.l !== 'EDIT' || Math.floor(u * 6) % 2 === 0 || u < b.t + 0.3);
      g.fillStyle = lit ? b.c : '#5a5a54'; rr(g, x, y + press * 6, 96, 70, 10); g.fill();
      g.fillStyle = lit ? INK : PAPER; g.font = `36px ${FT}`; g.textAlign = 'center'; g.fillText(b.l, x + 48, y + 49 + press * 6); g.textAlign = 'left';
    });
  }

  const CLIPS = [
    { k: 'train', w: 150, c: '#d9d4c8' }, { k: 'bandit', w: 160, c: '#b9b5ab' }, { k: 'face', w: 130, c: '#dcd6ca' }, { k: 'soup', w: 130, c: '#cfcbc1' },
    { k: 'moviola', w: 170, c: OCHRE }, { k: 'jump', w: 190, c: RED }, { k: 'tape', w: 170, c: TEAL },
  ];
  const ORDER_B = [0, 1, 5, 2, 3, 4, 6];
  function sNLE(g, u) {
    g.fillStyle = CHAR; g.fillRect(0, 0, W, H);
    const X0 = 500, Y0 = 90, WW = 1330, HH = 780;
    g.fillStyle = '#2a2d33'; rr(g, X0, Y0, WW, HH, 14); g.fill();
    g.fillStyle = '#34383f'; rr(g, X0, Y0, WW, 40, 14); g.fill(); g.fillRect(X0, Y0 + 26, WW, 14);
    ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(X0 + 24 + i * 22, Y0 + 20, 7, 0, TAU); g.fill(); });
    g.fillStyle = '#c9ccd3'; g.font = `600 17px ${FM}`; g.fillText('EDIT — history_of_the_cut.seq', X0 + 100, Y0 + 26);
    // bin
    g.fillStyle = '#23262b'; g.fillRect(X0 + 20, Y0 + 60, 360, 350);
    g.fillStyle = '#8b909a'; g.font = `600 15px ${FM}`; g.fillText('BIN · 7 CLIPS', X0 + 36, Y0 + 86);
    CLIPS.forEach((c, i) => { const bx = X0 + 36 + (i % 3) * 112, by = Y0 + 102 + Math.floor(i / 3) * 96; art(g, c.k, bx, by, 100, 75, 1.2, 0.8); g.strokeStyle = '#4b5059'; g.lineWidth = 2; g.strokeRect(bx, by, 100, 75); });
    // timeline geometry
    const TX = X0 + 110, TW = 1110, ry = Y0 + 440;
    const vy1 = ry + 150, vy2 = ry + 60, th = 80;
    const moveP = smooth((u - 1.3) / 0.5) * (1 - smooth((u - 2.5) / 0.4));
    const lift = smooth((u - 1.1) / 0.2) * (1 - smooth((u - 1.8) / 0.15)) + smooth((u - 2.45) / 0.1) * (1 - smooth((u - 2.9) / 0.1));
    const posA = [], posB = [];
    let acc = 0; CLIPS.forEach((c, i) => { posA[i] = acc; acc += c.w; });
    acc = 0; ORDER_B.forEach((ci) => { posB[ci] = acc; acc += CLIPS[ci].w; });
    const clipX = (i) => TX + lerp(posA[i], posB[i], moveP);
    const phX = TX + TW * clamp((u - 0.1) / 3.3) * 0.98;
    // viewer: clip under the playhead
    let under = 0; CLIPS.forEach((c, i) => { if (phX >= clipX(i) && phX < clipX(i) + c.w) under = i; });
    const vx = X0 + 470, vyy = Y0 + 60, vw = 440, vh = 330;
    art(g, CLIPS[under].k, vx, vyy, vw, vh, u, 0.9);
    g.strokeStyle = '#4b5059'; g.lineWidth = 3; g.strokeRect(vx, vyy, vw, vh);
    g.fillStyle = '#c9ccd3'; g.font = `600 18px ${FM}`;
    g.fillText('TC ' + tc(u * 30 + 7 * 30).replace('01:', '00:'), X0 + 950, Y0 + 90);
    g.fillStyle = '#8b909a'; g.font = `600 15px ${FM}`;
    ['24 FPS · 1920×1080', 'TRACKS  V2 V1 A1', 'UNDO LEVELS  ∞'].forEach((s, i) => g.fillText(s, X0 + 950, Y0 + 130 + i * 28));
    // ruler + tracks
    g.fillStyle = '#23262b'; g.fillRect(X0 + 20, ry, WW - 40, 320);
    g.strokeStyle = '#5b606a'; g.lineWidth = 1.5;
    for (let i = 0; i <= 44; i++) { const x = TX + (TW * i) / 44; g.beginPath(); g.moveTo(x, ry + 6); g.lineTo(x, ry + (i % 4 ? 16 : 26)); g.stroke(); }
    [['V2', vy2], ['V1', vy1], ['A1', ry + 240]].forEach(([l, y]) => { g.fillStyle = '#30343b'; g.fillRect(TX, y, TW, l === 'A1' ? 60 : th); g.fillStyle = '#8b909a'; g.font = `700 18px ${FM}`; g.fillText(l, X0 + 50, y + 34); });
    g.strokeStyle = '#4fd1c5'; g.lineWidth = 2; g.beginPath();
    for (let x = 0; x < TW; x += 4) { const a = 22 * Math.abs(Math.sin(x * 0.043) * Math.sin(x * 0.011 + 2)); g.moveTo(TX + x, ry + 270 - a); g.lineTo(TX + x, ry + 270 + a); }
    g.stroke();
    const SPLIT = 0.6, splitX = TX + TW * clamp((SPLIT - 0.1) / 3.3) * 0.98;
    CLIPS.forEach((c, i) => {
      const moving = i === 5;
      const y = moving ? lerp(vy1, vy2, lift) : vy1;
      const x = clipX(i);
      g.save();
      if (moving && lift > 0.05) { g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 20; g.shadowOffsetY = 8; }
      g.fillStyle = c.c; rr(g, x + 2, y + 2, c.w - 4, th - 4, 6); g.fill();
      g.restore();
      art(g, c.k, x + 6, y + 6, Math.min(107, c.w - 12), th - 12, 1, 0.8);
      g.fillStyle = 'rgba(0,0,0,0.55)'; g.font = `600 13px ${FM}`; if (c.w > 130) g.fillText(c.k.toUpperCase(), x + 118, y + 28);
      if (i === 1 && u > SPLIT) { const sx = splitX - posA[1] - TX + x; g.fillStyle = CHAR; g.fillRect(sx - 2, y, 4, th); }
    });
    // playhead
    g.fillStyle = RED; g.fillRect(phX - 1.5, ry, 3, 320); g.beginPath(); g.moveTo(phX - 10, ry); g.lineTo(phX + 10, ry); g.lineTo(phX, ry + 14); g.fill();
    // razor
    const rz = pulseW(u, 0.35, 0.5, 0.7, 0.85);
    if (rz > 0) {
      g.save(); g.globalAlpha = rz; g.translate(splitX, vy1 - 20 - (1 - smooth((u - 0.35) / 0.25)) * 60);
      g.fillStyle = '#e8e8e8'; g.beginPath(); g.moveTo(-18, -44); g.lineTo(18, -44); g.lineTo(18, -10); g.lineTo(0, 6); g.lineTo(-18, -10); g.fill();
      g.fillStyle = CHAR; g.fillRect(-4, -36, 8, 18); g.restore();
    }
    if (u > SPLIT && u < SPLIT + 0.15) { g.fillStyle = RED; g.fillRect(splitX - 3, vy1 - 10, 6, th + 20); }
    // undo toast
    const toast = pulseW(u, 2.3, 2.4, 3.0, 3.2);
    if (toast > 0) {
      g.save(); g.globalAlpha = toast; g.fillStyle = PAPER; rr(g, X0 + WW / 2 - 130, Y0 + HH - 70, 260, 50, 25); g.fill();
      g.fillStyle = INK; g.font = `700 22px ${FM}`; g.textAlign = 'center'; g.fillText('⌘Z  UNDO', X0 + WW / 2, Y0 + HH - 38); g.textAlign = 'left'; g.restore();
    }
    // cursor
    const keys = [[0, 1500, 300], [0.3, splitX + 30, vy1 - 90], [0.62, splitX + 30, vy1 - 90], [1.0, clipX(5) + 90, vy1 + 40], [1.3, TX + posA[5] + 90, vy1 + 40],
      [1.8, TX + posB[5] + 90, vy2 + 40], [2.2, 1500, 820], [3.5, 1560, 840]];
    let cx = keys[0][1], cy = keys[0][2];
    for (let k = 1; k < keys.length; k++) if (u >= keys[k - 1][0]) { const q = smooth((u - keys[k - 1][0]) / (keys[k][0] - keys[k - 1][0])); cx = lerp(keys[k - 1][1], keys[k][1], q); cy = lerp(keys[k - 1][2], keys[k][2], q); }
    if (u > 1.3 && u < 1.8) { cx = lerp(posA[5], posB[5], moveP) + TX + 90; cy = lerp(vy1, vy2, lift) + 40; }
    g.save(); g.translate(cx, cy); g.fillStyle = PAPER; g.strokeStyle = INK; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 30); g.lineTo(8, 23); g.lineTo(14, 36); g.lineTo(19, 34); g.lineTo(13, 21); g.lineTo(23, 21); g.closePath(); g.fill(); g.stroke(); g.restore();
  }
  function pulseW(u, a, b, c, d) { return smooth((u - a) / (b - a)) * (1 - smooth((u - c) / (d - c))); }

  let NLE_SNAP = null;
  function sPhone(g, u) {
    g.fillStyle = BLUE; g.fillRect(0, 0, W, H);
    const rot = -0.09 * smooth((u - 0.35) / 0.4);
    const PX = 1180, PY = 560, PW = 420, PH = 860;
    const scr = { x: -PW / 2 + 16, y: -PH / 2 + 18, w: PW - 32, h: PH - 36 };
    const pv = { x: scr.x + 12, y: scr.y + 70, w: scr.w - 24, h: (scr.w - 24) * 0.75 };
    g.save(); g.translate(PX, PY); g.rotate(rot);
    // hand behind: fingers on the left edge
    g.fillStyle = SKIN;
    [0, 1, 2].forEach((i) => { roughRect(g, -PW / 2 - 40, 60 + i * 72, 90, 58, 101 + i, 2); g.fill(); });
    g.fillStyle = INK; roughRect(g, -PW / 2 - 10, -PH / 2, PW + 20, PH, 105, 2); g.fill();
    g.fillStyle = '#0e1016'; g.fillRect(scr.x, scr.y, scr.w, scr.h);
    g.fillStyle = PAPER; g.font = `600 16px ${FM}`; g.fillText('9:41', scr.x + 20, scr.y + 30);
    g.font = `32px ${FT}`; g.fillText('MY CUT', scr.x + 20, scr.y + 60);
    const clipsP = ['train', 'bandit', 'face', 'jump', 'tape', 'moviola', 'soup'];
    const swipe = easeOut((u - 0.75) / 0.25) + easeOut((u - 1.2) / 0.25);
    const cur = Math.min(clipsP.length - 1, Math.round(swipe) + 1);
    art(g, clipsP[cur], pv.x, pv.y, pv.w, pv.h, u, 0.9);
    // strip of clips
    const sy = pv.y + pv.h + 60, cw = 96, chh = 72;
    g.save(); g.beginPath(); g.rect(scr.x, sy - 10, scr.w, chh + 20); g.clip();
    clipsP.forEach((k, i) => { const x = scr.x + scr.w / 2 - cw / 2 + (i - 1 - swipe) * (cw + 8); art(g, k, x, sy, cw, chh, 1, 0.8); });
    g.restore();
    g.fillStyle = RED; g.fillRect(scr.x + scr.w / 2 - 2, sy - 14, 4, chh + 28);
    const snip = u > 1.55 ? easeOutBack((u - 1.55) / 0.2, 3) : 0;
    const bR = 44 * (1 + 0.15 * Math.max(0, 1 - Math.abs(u - 1.55) / 0.1));
    const bx = 0, by = sy + chh + 120;
    g.fillStyle = RED; g.beginPath(); g.arc(bx, by, bR, 0, TAU); g.fill();
    g.strokeStyle = PAPER; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.arc(bx - 12, by + 14, 8, 0, TAU); g.moveTo(bx + 20, by + 14); g.arc(bx + 12, by + 14, 8, 0, TAU); g.stroke();
    g.beginPath(); g.moveTo(bx - 7, by + 8); g.lineTo(bx + 12, by - 24); g.moveTo(bx + 7, by + 8); g.lineTo(bx - 12, by - 24); g.stroke();
    if (snip > 0) { g.strokeStyle = PAPER; g.lineWidth = 4; g.globalAlpha = clamp(1 - (u - 1.55) / 0.35); g.beginPath(); g.arc(bx, by, bR + 30 * snip, 0, TAU); g.stroke(); g.globalAlpha = 1; }
    // thumb
    const tips = [[0, 150, sy + chh + 170], [0.7, 110, sy + 30], [0.95, -90, sy + 30], [1.15, 110, sy + 30], [1.4, -90, sy + 30], [1.5, bx + 20, by + 10], [1.8, bx + 30, by + 30]];
    let tx = tips[0][1], ty = tips[0][2];
    for (let k = 1; k < tips.length; k++) if (u >= tips[k - 1][0]) { const q = smooth((u - tips[k - 1][0]) / (tips[k][0] - tips[k - 1][0])); tx = lerp(tips[k - 1][1], tips[k][1], q); ty = lerp(tips[k - 1][2], tips[k][2], q); }
    g.fillStyle = SKIN;
    roughPoly(g, [[PW / 2 + 10, PH / 2 - 380], [PW / 2 + 200, PH / 2 - 300], [PW / 2 + 260, PH / 2 + 60], [-PW / 2 + 60, PH / 2 + 60], [-PW / 2 + 40, PH / 2 - 60]], 111, 3); g.fill();
    g.strokeStyle = SKIN; g.lineCap = 'round'; g.lineWidth = 64;
    g.beginPath(); g.moveTo(PW / 2 + 90, PH / 2 - 250); g.quadraticCurveTo(PW / 2 - 20, ty + 40, tx + 22, ty + 22); g.stroke();
    g.fillStyle = '#f9ece0'; g.beginPath(); g.ellipse(tx + 14, ty + 8, 16, 20, -0.6, 0, TAU); g.fill();
    g.fillStyle = INK; roughPoly(g, [[PW / 2 + 170, PH / 2 - 60], [PW / 2 + 420, PH / 2 - 160], [PW / 2 + 520, PH / 2 + 200], [PW / 2 + 140, PH / 2 + 200]], 113, 3); g.fill();
    g.restore();
    // zoom from the NLE into the phone preview
    const z = 1 - easeOut(u / 0.4);
    if (z > 0.001 && NLE_SNAP) {
      const tx0 = PX + pv.x, ty0 = PY + pv.y;
      g.drawImage(NLE_SNAP, lerp(tx0, 0, z), lerp(ty0, 0, z), lerp(pv.w, W, z), lerp(pv.w * 9 / 16, H, z));
    }
  }

  function finaleContent(g, u) {
    g.fillStyle = PAPER; g.fillRect(-50, -50, W + 100, H + 100);
    g.textAlign = 'center';
    const a1 = smooth(u / 0.15);
    g.fillStyle = `rgba(22,21,20,${a1})`; g.font = `600 30px ${FM}`; g.fillText('1895 → TODAY  ·  130 YEARS OF FILM EDITING', W / 2, 330);
    const k = u < 0.18 ? 0 : 1 + 0.25 * (1 - easeOut((u - 0.18) / 0.18));
    if (k > 0) { g.save(); g.translate(W / 2, 600); g.scale(k, k); g.fillStyle = INK; g.font = `380px ${FT}`; g.textBaseline = 'middle'; g.fillText('THE CUT.', 0, 20); g.restore(); }
    const a2 = smooth((u - 1.0) / 0.25);
    g.fillStyle = `rgba(22,21,20,${a2})`; g.font = `600 28px ${FM}`; g.textBaseline = 'alphabetic'; g.fillText('different tools, one idea: what you leave out.', W / 2, 850);
    g.textAlign = 'left';
  }
  let FIN_BUF = null;
  function sFinale(g, u) {
    const A = [300, 944], B = [1650, 244];
    const len = Math.hypot(B[0] - A[0], B[1] - A[1]), n = [(B[1] - A[1]) / len, -(B[0] - A[0]) / len];
    const d = 34 * easeOutBack((u - 0.8) / 0.25, 2);
    if (!FIN_BUF) { FIN_BUF = document.createElement('canvas'); FIN_BUF.width = W; FIN_BUF.height = H; }
    const fb = FIN_BUF.getContext('2d'); fb.setTransform(1, 0, 0, 1, 0, 0); fb.clearRect(0, 0, W, H); finaleContent(fb, u);
    g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
    const far = 3000;
    const half = (sgn) => {
      g.save(); g.beginPath();
      g.moveTo(A[0] - (B[0] - A[0]) * 2, A[1] - (B[1] - A[1]) * 2); g.lineTo(B[0] + (B[0] - A[0]) * 2, B[1] + (B[1] - A[1]) * 2);
      g.lineTo(B[0] + (B[0] - A[0]) * 2 + n[0] * far * sgn, B[1] + (B[1] - A[1]) * 2 + n[1] * far * sgn);
      g.lineTo(A[0] - (B[0] - A[0]) * 2 + n[0] * far * sgn, A[1] - (B[1] - A[1]) * 2 + n[1] * far * sgn); g.closePath(); g.clip();
      g.drawImage(FIN_BUF, n[0] * d * sgn, n[1] * d * sgn);
      g.restore();
    };
    half(1); half(-1);
    const sl = easeOut((u - 0.55) / 0.2);
    if (sl > 0) {
      g.strokeStyle = RED; g.lineWidth = u < 0.8 ? 14 : 10; g.lineCap = 'round';
      g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(lerp(A[0], B[0], sl), lerp(A[1], B[1], sl)); g.stroke();
    }
  }

  // ---------- timeline of beats ----------
  const SCENES = [
    { t0: 0, t1: 3, draw: s1895, year: 1895, title: 'ONE SHOT. NO CUTS.', sub: 'The Lumière brothers film a train arriving, in a single take.', fg: PAPER },
    { t0: 3, t1: 4.3, draw: sSplice, year: 1903, title: 'CUT. GLUE. JOIN.', sub: 'Editors splice film by hand; The Great Train Robbery cuts between places.', fg: INK },
    { t0: 4.3, t1: 6.5, draw: sKuleshov, year: 1920, title: 'MEANING LIVES BETWEEN SHOTS', sub: 'The Kuleshov effect: the next shot changes how we read a face.', fg: INK },
    { t0: 6.5, t1: 8, draw: sMoviola, year: 1924, title: 'THE MOVIOLA', sub: 'A viewer on the bench: editors can watch the film as they cut it.', fg: INK },
    { t0: 8, t1: 10, draw: sJump, year: 1960, title: 'THE JUMP CUT', sub: 'Godard\u2019s Breathless breaks continuity on purpose.', fg: PAPER },
    { t0: 10, t1: 13, draw: sTape, year: 1970, title: 'VIDEOTAPE & TIMECODE', sub: 'Linear editing: every shot is re-recorded in order, tape to tape.', fg: PAPER },
    { t0: 13, t1: 16.5, draw: sNLE, year: 1989, title: 'NONLINEAR, DIGITAL', sub: 'Avid Media Composer: cut anywhere, move anything, undo.', fg: PAPER },
    { t0: 16.5, t1: 18.3, draw: sPhone, year: 2026, title: 'EVERYONE\u2019S AN EDITOR', sub: 'The cutting room now fits in your pocket.', fg: PAPER },
    { t0: 18.3, t1: 20, draw: sFinale, year: null, fg: INK },
  ];
  const CUTS = [3, 3.4, 4.3, 5.4, 6.5, 8, 8.3, 8.6, 8.9, 9.2, 9.5, 9.8, 10, 13, 13.6, 16.5, 17.05, 18.3, 19.1];
  const sceneIndex = (t) => { for (let i = SCENES.length - 1; i >= 0; i--) if (t >= SCENES[i].t0) return i; return 0; };

  // ---------- HUD ----------
  function drawYear(g, t, i) {
    const sc = SCENES[i];
    if (sc.year == null) return;
    const prev = i > 0 ? String(SCENES[i - 1].year) : String(sc.year), now = String(sc.year), dt = t - sc.t0;
    g.save();
    g.font = `210px ${FT}`; g.fillStyle = sc.fg; g.textBaseline = 'alphabetic';
    const x0 = 90, base = 250, cellH = 190;
    let x = x0;
    for (let d = 0; d < 4; d++) {
      const cw = g.measureText(now[d]).width, pw = g.measureText(prev[d]).width, w = Math.max(cw, pw);
      const p = prev[d] === now[d] ? 1 : easeOutBack((dt - d * 0.05) / 0.32, 1.4);
      g.save(); g.beginPath(); g.rect(x - 4, base - cellH, w + 8, cellH + 20); g.clip();
      if (p < 1) g.fillText(prev[d], x, base - p * cellH);
      g.fillText(now[d], x, base + (1 - p) * cellH);
      g.restore();
      x += w + 2;
    }
    g.fillStyle = RED; g.fillRect(x0 + 4, base + 14, 120, 8);
    g.restore();
  }
  function drawCaption(g, t, i) {
    const sc = SCENES[i];
    if (!sc.title) return;
    const p = easeOut((t - sc.t0) / 0.28);
    g.save();
    g.beginPath(); g.rect(0, 860, 90 + 1500 * p, 190); g.clip();
    g.fillStyle = sc.fg;
    g.font = `92px ${FT}`; g.fillText(sc.title, 92, 968);
    g.globalAlpha = 0.85; g.font = `500 25px ${FM}`; g.fillText(sc.sub, 96, 1010);
    g.restore();
  }
  function drawCuts(g, t, fg) {
    const n = CUTS.filter((c) => t >= c).length;
    const last = CUTS.filter((c) => t >= c).pop() ?? -9;
    const pop = 1 + 0.35 * Math.max(0, 1 - (t - last) / 0.18);
    g.save();
    g.fillStyle = fg; g.textAlign = 'right';
    g.font = `600 20px ${FM}`; g.fillText('CUTS IN THIS FILM', W - 96, 92);
    g.translate(W - 96, 168); g.scale(pop, pop); g.font = `84px ${FT}`; g.fillText(String(n).padStart(2, '0'), 0, 0);
    g.restore();
  }
  function drawTimeline(g, t, fg) {
    const x0 = 96, x1 = W - 96, y = 1048;
    const yr = (Y) => x0 + ((Y - 1895) / (2026 - 1895)) * (x1 - x0);
    g.save(); g.globalAlpha = 0.5; g.fillStyle = fg; g.fillRect(x0, y, x1 - x0, 3);
    SCENES.forEach((s) => { if (s.year) g.fillRect(yr(s.year) - 1.5, y - 8, 3, 19); });
    g.globalAlpha = 1;
    const i = sceneIndex(t), sc = SCENES[i];
    const cur = sc.year ?? 2026, prv = i > 0 ? SCENES[i - 1].year ?? 2026 : cur;
    const mx = lerp(yr(prv), yr(cur), easeOut((t - sc.t0) / 0.4));
    g.fillStyle = RED; g.fillRect(x0, y - 1, mx - x0, 5); g.beginPath(); g.arc(mx, y + 1.5, 9, 0, TAU); g.fill();
    g.restore();
  }

  // ---------- post: grain, glitch, pixelate ----------
  let GRAIN = null, TMP = null;
  function buildGrain() {
    const gw = W + 24, gh = H + 24, c = document.createElement('canvas'); c.width = gw; c.height = gh;
    const g = c.getContext('2d'), rnd = mulberry32(1895), img = g.createImageData(gw, gh), d = img.data;
    for (let i = 0; i < gw * gh; i++) { const v = 128 + (rnd() - 0.5) * 64 + (rnd() < 0.003 ? -80 : 0); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
    g.putImageData(img, 0, 0);
    for (let i = 0; i < 220; i++) {
      const x = rnd() * gw, y = rnd() * gh, r = 80 + rnd() * 260, gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, rnd() < 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'); gr.addColorStop(1, 'rgba(128,128,128,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    g.lineCap = 'round';
    for (let i = 0; i < 800; i++) {
      const x = rnd() * gw, y = rnd() * gh, l = 8 + rnd() * 26, a = rnd() * TAU;
      g.strokeStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.14)'; g.lineWidth = 0.6 + rnd();
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    GRAIN = c;
    TMP = document.createElement('canvas'); TMP.width = W; TMP.height = H;
  }
  function snapshot(g) { const tg = TMP.getContext('2d'); tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, W, H); tg.drawImage(g.canvas, 0, 0); }
  function glitch(g, amt, seed) {
    snapshot(g);
    const bands = 9;
    for (let b = 0; b < bands; b++) {
      const y = Math.floor(hash(seed + b) * H), h = 20 + hash(seed * 3 + b) * 90, dx = (hash(seed * 7 + b) - 0.5) * 260 * amt;
      g.drawImage(TMP, 0, y, W, h, dx, y, W, h);
    }
    g.fillStyle = `rgba(255,255,255,${0.5 * amt})`;
    for (let k = 0; k < 14; k++) g.fillRect(0, hash(seed + k * 5) * H, W, 2 + hash(k) * 3);
  }
  function pixelate(g, px) {
    snapshot(g);
    const sw = Math.max(1, Math.round(W / px)), sh = Math.max(1, Math.round(H / px));
    const tg = TMP.getContext('2d');
    tg.imageSmoothingEnabled = true; tg.drawImage(TMP, 0, 0, W, H, 0, 0, sw, sh);
    g.imageSmoothingEnabled = false; g.drawImage(TMP, 0, 0, sw, sh, 0, 0, W, H); g.imageSmoothingEnabled = true;
  }

  function drawFrame(g, t) {
    t = clamp(t, 0, DUR - 1e-6);
    if (!GRAIN) buildGrain();
    BOIL = Math.floor(t * 8);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    const i = sceneIndex(t), sc = SCENES[i], u = t - sc.t0;
    if (sc.draw === sPhone && !NLE_SNAP) {
      NLE_SNAP = document.createElement('canvas'); NLE_SNAP.width = W; NLE_SNAP.height = H;
      const ng = NLE_SNAP.getContext('2d'); sNLE(ng, 3.5); drawYear(ng, 16.49, 6); drawCaption(ng, 16.49, 6);
    }
    sc.draw(g, u);
    if (sc.draw === sTape && u < 0.3) glitch(g, 1 - u / 0.3, Math.floor(u * 30));
    if (sc.draw === sNLE && u < 0.4) pixelate(g, Math.max(1, Math.round(lerp(64, 1, easeOut(u / 0.4)))));
    drawYear(g, t, i);
    drawCaption(g, t, i);
    drawCuts(g, t, sc.fg);
    drawTimeline(g, t, sc.fg);
    const step = Math.floor(t * 12) % 3, off = [[0, 0], [11, 7], [5, 17]][step];
    g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.38; g.drawImage(GRAIN, -off[0], -off[1]);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    g.restore();
  }

  window.FilmHistory = { W, H, DUR, drawFrame, SCENES };
})();
