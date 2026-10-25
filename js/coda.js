// Interactive explainer for the DCCE paper: pick a coda type, see its two channels
// (rhythm = inter-click intervals, spectral = per-click texture) and where the fused
// embedding lands. Clicks are synthesised with WebAudio; timings are illustrative.

const SEA = (a) => `rgba(127,227,255,${a})`;
const LIME = (a) => `rgba(207,255,127,${a})`;

const TYPES = {
  "1+1+3": { icis: [0.34, 0.31, 0.085, 0.085], peak: 0.62, cluster: [0.27, 0.32] },
  "5R1":   { icis: [0.17, 0.17, 0.17, 0.17],   peak: 0.42, cluster: [0.7, 0.28] },
  "4R1":   { icis: [0.2, 0.2, 0.2],            peak: 0.5,  cluster: [0.58, 0.72] },
  "5R3":   { icis: [0.29, 0.29, 0.29, 0.29],   peak: 0.33, cluster: [0.22, 0.74] },
};

function fit(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  const c = canvas.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return [c, w, h];
}
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export function initCoda(root, { reduced = false } = {}) {
  const typesEl = root.querySelector(".coda-types");
  const rhythm = root.querySelector(".rhythm"), spectral = root.querySelector(".spectral"), embed = root.querySelector(".embed");
  const playBtn = root.querySelector("#playCoda");
  let current = "1+1+3", sample = 0, playhead = -1, audio = null, anim = 0;

  // fixed embedding cloud
  const r0 = rng(42), cloud = [];
  for (const [name, T] of Object.entries(TYPES)) for (let i = 0; i < 46; i++)
    cloud.push({ name, x: T.cluster[0] + (r0() + r0() - 1) * 0.09, y: T.cluster[1] + (r0() + r0() - 1) * 0.08 });

  Object.keys(TYPES).forEach((name) => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = name; b.setAttribute("aria-pressed", String(name === current));
    b.addEventListener("click", () => { current = name; sample++; [...typesEl.children].forEach((x) => x.setAttribute("aria-pressed", String(x === b))); drawAll(); });
    typesEl.appendChild(b);
  });

  function clickTimes(name) {
    const out = [0]; TYPES[name].icis.forEach((d) => out.push(out[out.length - 1] + d)); return out;
  }

  function drawRhythm() {
    const [c, w, h] = fit(rhythm), span = 1.25, pad = 18;
    const X = (t) => pad + (t / span) * (w - pad * 2);
    c.strokeStyle = SEA(.12); c.beginPath(); c.moveTo(pad, h * .62); c.lineTo(w - pad, h * .62); c.stroke();
    c.fillStyle = SEA(.35); c.font = '10px "Space Mono", monospace';
    for (let t = 0; t <= span + 1e-6; t += 0.25) { c.fillRect(X(t), h * .62, 1, 4); c.fillText(t.toFixed(2) + "s", X(t) - 12, h - 4); }
    const ts = clickTimes(current);
    ts.forEach((t, i) => {
      const hot = playhead >= t && playhead < t + 0.06;
      c.strokeStyle = hot ? LIME(1) : SEA(.95); c.lineWidth = hot ? 3 : 2;
      c.beginPath(); c.moveTo(X(t), h * .62); c.lineTo(X(t), h * .3); c.stroke();
      if (i) { // ICI bracket
        const a = X(ts[i - 1]), b = X(t);
        c.strokeStyle = SEA(.35); c.lineWidth = 1; c.beginPath(); c.moveTo(a + 2, h * .22); c.lineTo(b - 2, h * .22); c.moveTo(a + 2, h * .18); c.lineTo(a + 2, h * .26); c.moveTo(b - 2, h * .18); c.lineTo(b - 2, h * .26); c.stroke();
        c.fillStyle = SEA(.75); const lbl = Math.round((t - ts[i - 1]) * 1000) + "ms";
        if (b - a > 34) c.fillText(lbl, (a + b) / 2 - c.measureText(lbl).width / 2, h * .14);
      }
    });
    if (playhead >= 0) { c.strokeStyle = LIME(.6); c.lineWidth = 1; c.beginPath(); c.moveTo(X(playhead), 6); c.lineTo(X(playhead), h * .66); c.stroke(); }
  }

  function drawSpectral() {
    const [c, w, h] = fit(spectral), span = 1.25, pad = 18, bands = 24, frames = 120;
    const r = rng(sample * 977 + current.length * 31), T = TYPES[current], ts = clickTimes(current);
    const fw = (w - pad * 2) / frames, bh = h / bands;
    for (let f = 0; f < frames; f++) {
      const t = (f / frames) * span;
      const near = ts.reduce((m, ct) => Math.max(m, Math.exp(-(((t - ct) / 0.012) ** 2))), 0);
      for (let b = 0; b < bands; b++) {
        const bf = b / bands, shape = Math.exp(-(((bf - T.peak) / 0.22) ** 2));
        const v = Math.min(1, near * (0.35 + shape * 0.9) * (0.75 + r() * 0.5) + r() * 0.05);
        if (v < 0.03) continue;
        c.fillStyle = v > 0.7 ? LIME(v) : SEA(v * 0.9);
        c.fillRect(pad + f * fw, h - (b + 1) * bh, fw + 0.6, bh - 0.6);
      }
    }
    if (playhead >= 0) { const x = pad + (playhead / span) * (w - pad * 2); c.strokeStyle = LIME(.6); c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
  }

  function drawEmbed(pulse = 0) {
    const [c, w, h] = fit(embed);
    cloud.forEach((p) => { const on = p.name === current; c.fillStyle = on ? SEA(.85) : SEA(.16); c.beginPath(); c.arc(p.x * w, p.y * h, on ? 2.6 : 2, 0, 7); c.fill(); });
    c.font = '10px "Space Mono", monospace';
    for (const [name, T] of Object.entries(TYPES)) { c.fillStyle = name === current ? SEA(1) : SEA(.35); c.fillText(name, T.cluster[0] * w + 26, T.cluster[1] * h - 14); }
    const r = rng(sample * 131 + 7), T = TYPES[current];
    const px = (T.cluster[0] + (r() - .5) * .05) * w, py = (T.cluster[1] + (r() - .5) * .05) * h;
    c.strokeStyle = LIME(.9); c.lineWidth = 1.5; c.beginPath(); c.arc(px, py, 7 + pulse * 8, 0, 7); c.stroke();
    c.fillStyle = LIME(1); c.beginPath(); c.arc(px, py, 3.5, 0, 7); c.fill();
    c.fillStyle = LIME(.85); c.fillText("this coda", px + 12, py + 18);
  }

  function drawAll(pulse) { drawRhythm(); drawSpectral(); drawEmbed(pulse); }

  function clickSound(ctx, when, bright) {
    const len = Math.floor(ctx.sampleRate * 0.006), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.18));
    const src = ctx.createBufferSource(); src.buffer = buf;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1200 + bright * 5000; bp.Q.value = 0.9;
    const g = ctx.createGain(); g.gain.value = 0.9;
    src.connect(bp).connect(g).connect(ctx.destination); src.start(when);
  }

  function play() {
    sample++;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume();
      const t0 = audio.currentTime + 0.05;
      clickTimes(current).forEach((t) => clickSound(audio, t0 + t, TYPES[current].peak));
    } catch (_) { /* no audio: still animate */ }
    const total = clickTimes(current).slice(-1)[0] + 0.15, start = performance.now();
    cancelAnimationFrame(anim);
    const step = () => {
      playhead = (performance.now() - start) / 1000;
      drawAll(Math.max(0, 1 - playhead / total));
      if (playhead < total && !reduced) anim = requestAnimationFrame(step); else { playhead = -1; drawAll(); }
    };
    step();
  }

  playBtn.addEventListener("click", play);
  let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => drawAll(), 120); });
  drawAll();
  return { play, select(name) { if (TYPES[name]) { [...typesEl.children].find((b) => b.textContent === name)?.click(); } } };
}
