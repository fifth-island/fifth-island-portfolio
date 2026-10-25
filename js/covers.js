// Generative card covers: one small data-glyph per project, drawn in lime on black,
// each echoing what the project actually is (a t-SNE scatter, a sensor heatmap…).

const L = (a) => `rgba(207,255,127,${a})`;

function rng(seed) {
  let s = 0;
  for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  return () => { s += 0x6d2b79f5; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const gauss = (r) => (r() + r() + r() - 1.5) / 1.5;

const DRAW = {
  lines(c, w, h, r) { // multi-asset sensor time series with a threshold band
    c.fillStyle = L(.05); c.fillRect(0, h * .22, w, h * .16);
    c.setLineDash([3, 4]); c.strokeStyle = L(.35); c.beginPath(); c.moveTo(0, h * .3); c.lineTo(w, h * .3); c.stroke(); c.setLineDash([]);
    for (let k = 0; k < 5; k++) {
      let y = h * (.45 + k * .09); c.strokeStyle = L(k === 0 ? .95 : .25 + k * .05); c.lineWidth = k === 0 ? 1.8 : 1;
      c.beginPath();
      for (let x = 0; x <= w; x += 4) { y += gauss(r) * 3; y = Math.max(h * .2, Math.min(h * .92, y)); x ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.stroke();
    }
    c.fillStyle = L(1); c.beginPath(); c.arc(w * .82, h * .28, 4, 0, 7); c.fill();
  },
  scatter(c, w, h, r) { // embedding clusters (t-SNE)
    const k = 7;
    for (let i = 0; i < k; i++) {
      const cx = w * (.12 + r() * .76), cy = h * (.18 + r() * .64), s = 10 + r() * 16, hot = i === 2;
      for (let j = 0; j < 46; j++) {
        c.fillStyle = L(hot ? .95 : .25 + r() * .3);
        c.beginPath(); c.arc(cx + gauss(r) * s * 1.6, cy + gauss(r) * s, hot ? 2.1 : 1.7, 0, 7); c.fill();
      }
    }
    c.strokeStyle = L(.6); c.setLineDash([2, 3]); c.beginPath(); c.arc(w * .5, h * .5, 3, 0, 7); c.stroke(); c.setLineDash([]);
  },
  heatmap(c, w, h, r) { // hour x weekday exposure grid
    const cols = 24, rows = 7, cw = w / cols, ch = h / rows;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const v = Math.max(0, Math.min(1, .25 + .6 * Math.exp(-((x - 15) ** 2) / 30) + gauss(r) * .18 - (y > 4 ? .12 : 0)));
      c.fillStyle = L(.06 + v * .85); c.fillRect(x * cw + 1, y * ch + 1, cw - 2, ch - 2);
    }
  },
  grid(c, w, h, r) { // humanoid sim: floor grid + skeleton
    c.strokeStyle = L(.12);
    for (let i = -10; i <= 10; i++) { c.beginPath(); c.moveTo(w / 2 + i * 40, h); c.lineTo(w / 2 + i * 8, h * .55); c.stroke(); }
    for (let j = 0; j < 6; j++) { const y = h * .55 + (h * .45) * (j / 5) ** 1.6; c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    const x = w * .5, y = h * .2, s = h * .13;
    const pts = { head: [x, y], neck: [x, y + s * .7], hip: [x, y + s * 2.4], lh: [x - s * .9, y + s * 1.6], rh: [x + s * 1.1, y + s * .9], lf: [x - s * .5, y + s * 3.8], rf: [x + s * .6, y + s * 3.7] };
    c.strokeStyle = L(.95); c.lineWidth = 2;
    [["neck", "hip"], ["neck", "lh"], ["neck", "rh"], ["hip", "lf"], ["hip", "rf"]].forEach(([a, b]) => { c.beginPath(); c.moveTo(...pts[a]); c.lineTo(...pts[b]); c.stroke(); });
    c.beginPath(); c.arc(x, y, s * .38, 0, 7); c.stroke();
    Object.values(pts).forEach((p) => { c.fillStyle = L(1); c.beginPath(); c.arc(p[0], p[1], 2.6, 0, 7); c.fill(); });
  },
  bars(c, w, h, r) { // model accuracy comparison
    const n = 8, bh = h / (n + 1);
    for (let i = 0; i < n; i++) {
      const v = .55 + r() * .35 - i * .02, best = i === 0;
      c.fillStyle = L(best ? .95 : .22); c.fillRect(w * .08, bh * (i + .6), w * .84 * v, bh * .55);
    }
  },
  pixels(c, w, h, r) { // tiny garment sprites
    const shapes = [[0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 0, 1, 1, 0], [1, 1, 1, 1, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0], [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0], [1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0]];
    const cell = Math.max(5, Math.floor(h / 13)), gw = cell * 4 + cell;
    for (let gx = 0; gx * gw < w; gx++) for (let gy = 0; gy * gw < h; gy++) {
      const sh = shapes[Math.floor(r() * shapes.length)], hot = r() < .12;
      sh.forEach((on, k) => { if (!on) return; c.fillStyle = L(hot ? .9 : .18 + r() * .2); c.fillRect(gx * gw + (k % 4) * cell, gy * gw + Math.floor(k / 4) * cell, cell - 1, cell - 1); });
    }
  },
  wave(c, w, h, r) { // groundwater level curve + forecast band
    c.strokeStyle = L(.15);
    for (let y = h * .3; y < h; y += 12) { c.beginPath(); for (let x = 0; x <= w; x += 6) { const yy = y + Math.sin(x * .03 + y) * 2; x ? c.lineTo(x, yy) : c.moveTo(x, yy); } c.stroke(); }
    c.strokeStyle = L(.95); c.lineWidth = 2; c.beginPath();
    for (let x = 0; x <= w * .7; x += 3) { const y = h * .45 + Math.sin(x * .025) * h * .12 + gauss(r) * 2; x ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.stroke(); c.setLineDash([4, 4]); c.beginPath();
    for (let x = w * .7; x <= w; x += 3) { const y = h * .45 + Math.sin(x * .025) * h * .12; x === w * .7 ? c.moveTo(x, y) : c.lineTo(x, y); }
    c.stroke(); c.setLineDash([]);
  },
  glyphs(c, w, h, r) { // archaic text being paraphrased
    const words = ["thou", "hath", "ere", "whence", "doth", "→", "you", "has", "before", "where", "does", "ODYSSEY", "wine-dark", "sea"];
    c.font = `${Math.round(h / 9)}px "Space Mono", monospace`;
    for (let y = h * .16; y < h; y += h / 7) {
      let x = (r() - .5) * 40;
      while (x < w) { const word = words[Math.floor(r() * words.length)]; const hot = word === "→" || r() < .08; c.fillStyle = L(hot ? .95 : .2); c.fillText(word, x, y); x += c.measureText(word + " ").width; }
    }
  },
  treemap(c, w, h, r) {
    const split = (x, y, ww, hh, d) => {
      if (d > 4 || ww < 30 || hh < 24) { c.fillStyle = L(.08 + r() * .45); c.fillRect(x + 1, y + 1, ww - 2, hh - 2); return; }
      const f = .35 + r() * .3;
      if (ww > hh) { split(x, y, ww * f, hh, d + 1); split(x + ww * f, y, ww * (1 - f), hh, d + 1); }
      else { split(x, y, ww, hh * f, d + 1); split(x, y + hh * f, ww, hh * (1 - f), d + 1); }
    };
    split(0, 0, w, h, 0);
  },
  agents(c, w, h, r) { // households + tanker routes
    const hubs = Array.from({ length: 4 }, () => [w * (.15 + r() * .7), h * (.2 + r() * .6)]);
    c.strokeStyle = L(.25); hubs.forEach((a, i) => hubs.slice(i + 1).forEach((b) => { c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.stroke(); }));
    for (let i = 0; i < 160; i++) { const hb = hubs[i % 4]; c.fillStyle = L(.2 + r() * .4); c.fillRect(hb[0] + gauss(r) * 60, hb[1] + gauss(r) * 40, 3, 3); }
    hubs.forEach((p) => { c.strokeStyle = L(.95); c.beginPath(); c.arc(p[0], p[1], 8, 0, 7); c.stroke(); });
  },
  chain(c, w, h, r) {
    const n = 6, bw = w / (n + 1.5), bh = h * .32, y = h * .34;
    for (let i = 0; i < n; i++) {
      const x = bw * .4 + i * bw * 1.18;
      c.strokeStyle = L(i === n - 1 ? .95 : .4); c.strokeRect(x, y, bw * .8, bh);
      c.fillStyle = L(.5); c.font = `${Math.round(bh / 5)}px "Space Mono", monospace`; c.fillText("#" + Math.floor(r() * 0xfff).toString(16), x + 6, y + bh / 3);
      for (let k = 0; k < 3; k++) { c.fillStyle = L(.18); c.fillRect(x + 6, y + bh / 2 + k * bh / 7, bw * .8 * (.4 + r() * .4), 3); }
      if (i) { c.strokeStyle = L(.6); c.beginPath(); c.moveTo(x - bw * .38, y + bh / 2); c.lineTo(x, y + bh / 2); c.stroke(); }
    }
  },
  layout(c, w, h, r) { // wireframe of a website
    c.strokeStyle = L(.5); c.strokeRect(w * .1, h * .1, w * .8, h * .85);
    c.fillStyle = L(.85); c.fillRect(w * .14, h * .16, w * .18, h * .05);
    c.fillStyle = L(.2); for (let i = 0; i < 4; i++) c.fillRect(w * (.5 + i * .09), h * .17, w * .06, h * .03);
    c.fillStyle = L(.12); c.fillRect(w * .14, h * .28, w * .72, h * .26);
    c.fillStyle = L(.9); c.fillRect(w * .18, h * .36, w * .3, h * .05);
    for (let i = 0; i < 3; i++) { c.fillStyle = L(.16); c.fillRect(w * (.14 + i * .245), h * .6, w * .22, h * .28); }
  },
  network(c, w, h, r) { // neural net layers
    const layers = [5, 8, 8, 6, 3];
    const pos = layers.map((n, i) => Array.from({ length: n }, (_, j) => [w * (.12 + i * .19), h * ((j + 1) / (n + 1))]));
    for (let i = 0; i < pos.length - 1; i++) pos[i].forEach((a) => pos[i + 1].forEach((b) => { c.strokeStyle = L(r() < .08 ? .7 : .07); c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.stroke(); }));
    pos.flat().forEach((p) => { c.fillStyle = L(.9); c.beginPath(); c.arc(p[0], p[1], 3, 0, 7); c.fill(); });
  },
  graph(c, w, h, r) { // network science graph
    const pts = Array.from({ length: 34 }, () => [w * (.08 + r() * .84), h * (.1 + r() * .8)]);
    pts.forEach((a, i) => pts.forEach((b, j) => { if (j <= i) return; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (d < w * .16) { c.strokeStyle = L(.22); c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.stroke(); } }));
    pts.forEach((p, i) => { c.fillStyle = L(i % 9 === 0 ? 1 : .55); c.beginPath(); c.arc(p[0], p[1], i % 9 === 0 ? 4.5 : 2.4, 0, 7); c.fill(); });
  },
  rings(c, w, h, r) { // workout timer rings
    const cx = w * .5, cy = h * .52, R = h * .36;
    [[1, .95, .78], [.8, .5, .52], [.6, .3, .3]].forEach(([s, a, f]) => {
      c.lineWidth = 7; c.strokeStyle = L(.1); c.beginPath(); c.arc(cx, cy, R * s, 0, 7); c.stroke();
      c.strokeStyle = L(a); c.beginPath(); c.arc(cx, cy, R * s, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); c.stroke();
    });
    c.fillStyle = L(.95); c.font = `700 ${Math.round(h / 8)}px "Space Mono", monospace`; c.textAlign = "center"; c.fillText("12:00", cx, cy + h / 30); c.textAlign = "left";
    c.fillStyle = L(.4); c.font = `${Math.round(h / 16)}px "Space Mono", monospace`; c.fillText("AMRAP", w * .08, h * .18); c.fillText("EMOM", w * .08, h * .3);
  },
  calendar(c, w, h, r) { // training log heat calendar
    const cols = 20, rows = 7, s = Math.min(w / (cols + 2), h / (rows + 2));
    for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) { const v = r(); c.fillStyle = L(v < .45 ? .06 : v < .75 ? .3 : .9); c.fillRect(w / 2 - (cols * s) / 2 + x * s + 1, h / 2 - (rows * s) / 2 + y * s + 1, s - 3, s - 3); }
  },
  weave(c, w, h, r) { // recycled foam / material weave
    for (let i = 0; i < 26; i++) { c.strokeStyle = L(.12 + r() * .45); c.lineWidth = 1 + r() * 2; c.beginPath(); c.moveTo(-20, h * r()); c.bezierCurveTo(w * .3, h * r(), w * .7, h * r(), w + 20, h * r()); c.stroke(); }
  },
  gear(c, w, h, r) {
    const g = (cx, cy, R, teeth, a) => { c.strokeStyle = L(a); c.lineWidth = 2; c.beginPath(); for (let i = 0; i <= teeth * 2; i++) { const ang = (i / (teeth * 2)) * Math.PI * 2, rr = i % 2 ? R : R * .82; i ? c.lineTo(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr) : c.moveTo(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr); } c.stroke(); c.beginPath(); c.arc(cx, cy, R * .3, 0, 7); c.stroke(); };
    g(w * .42, h * .52, h * .34, 12, .9); g(w * .42 + h * .5, h * .3, h * .2, 8, .4);
  },
  wave2(c, w, h, r) { this.wave(c, w, h, r); },
};

export function drawCover(canvas, type, seed) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth || 400, h = canvas.clientHeight || 200;
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  const c = canvas.getContext("2d");
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.fillStyle = "#090d0a"; c.fillRect(0, 0, w, h);
  c.strokeStyle = L(.04); c.lineWidth = 1;
  for (let x = 0; x < w; x += 24) { c.beginPath(); c.moveTo(x + .5, 0); c.lineTo(x + .5, h); c.stroke(); }
  for (let y = 0; y < h; y += 24) { c.beginPath(); c.moveTo(0, y + .5); c.lineTo(w, y + .5); c.stroke(); }
  c.lineWidth = 1;
  (DRAW[type] || DRAW.graph).call(DRAW, c, w, h, rng(seed));
}
