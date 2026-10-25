// Hero background: a bank of oscilloscope traces. Each trace is noisy and carries
// little click trains (codas). Near the cursor the noise collapses and the trace
// lights up: raw signal -> structure. Without a mouse, a slow wandering focus does it.

const LIME = "207,255,127";

export function startSignal(canvas, { reduced = false } = {}) {
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, dpr = 1, lines = [], raf = 0, running = false, t = 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0, live: false, lastMove: 0 };

  function rand(seed) { // small deterministic PRNG per line
    let s = seed >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  }

  function build() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const gap = W < 700 ? 26 : 22;
    const n = Math.ceil(H / gap) + 1;
    lines = Array.from({ length: n }, (_, i) => {
      const r = rand(i * 9973 + 17);
      const clicks = [];
      const groups = 1 + Math.floor(r() * 2);
      for (let g = 0; g < groups; g++) {
        const start = r(), count = 3 + Math.floor(r() * 3), ici = 0.012 + r() * 0.02;
        for (let c = 0; c < count; c++) clicks.push(start + c * ici * (c > 1 && r() > .6 ? .4 : 1));
      }
      return {
        y: i * gap + gap / 2,
        amp: 4 + r() * 9,
        f1: 0.006 + r() * 0.01, f2: 0.02 + r() * 0.03,
        s1: 0.4 + r() * 0.8, s2: 0.6 + r() * 1.2,
        ph: r() * Math.PI * 2, drift: 0.01 + r() * 0.025,
        clicks,
      };
    });
    if (!pointer.live) { pointer.x = pointer.tx = W * 0.68; pointer.y = pointer.ty = H * 0.45; }
  }

  function noise(x, k) { // cheap deterministic jitter
    const s = Math.sin(x * 12.9898 + k * 78.233) * 43758.5453;
    return s - Math.floor(s) - 0.5;
  }

  function frame() {
    t += 1 / 60;
    if (!pointer.live || performance.now() - pointer.lastMove > 3500) {
      pointer.tx = W * (0.62 + 0.24 * Math.sin(t * 0.21)); // idle wander
      pointer.ty = H * (0.48 + 0.3 * Math.sin(t * 0.33 + 1.3));
    }
    pointer.x += (pointer.tx - pointer.x) * 0.08;
    pointer.y += (pointer.ty - pointer.y) * 0.08;

    ctx.clearRect(0, 0, W, H);

    // faint oscilloscope graticule
    ctx.strokeStyle = `rgba(${LIME},0.035)`; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < W; x += 96) { ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, H); }
    ctx.stroke();

    const R = Math.max(160, Math.min(W, H) * 0.28);
    const grad = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, R * 1.25);
    grad.addColorStop(0, `rgba(${LIME},1)`);
    grad.addColorStop(0.4, `rgba(${LIME},0.62)`);
    grad.addColorStop(1, `rgba(${LIME},0.2)`);
    // soft glow behind the resolved region
    const glow = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, R);
    glow.addColorStop(0, `rgba(${LIME},0.07)`); glow.addColorStop(1, `rgba(${LIME},0)`);
    ctx.fillStyle = glow; ctx.fillRect(pointer.x - R, pointer.y - R, R * 2, R * 2);
    ctx.strokeStyle = grad; ctx.lineWidth = 1.25; ctx.lineJoin = "round";

    const step = W < 700 ? 7 : 5;
    for (let li = 0; li < lines.length; li++) {
      const L = lines[li];
      const dy = (L.y - pointer.y) / R;
      const rowFocus = Math.exp(-dy * dy * 1.6);
      ctx.beginPath();
      for (let x = 0; x <= W + step; x += step) {
        const dx = (x - pointer.x) / R;
        const focus = rowFocus * Math.exp(-dx * dx * 1.2); // 1 = fully resolved
        let v = Math.sin(x * L.f1 + t * L.s1 + L.ph) * L.amp * 0.7
              + Math.sin(x * L.f2 - t * L.s2) * L.amp * 0.35
              + noise(x, li + Math.floor(t * 12)) * L.amp * 0.9;
        // coda clicks drifting along the trace
        let spike = 0;
        for (const c of L.clicks) {
          const cx = (((c + t * L.drift) % 1) + 1) % 1 * (W + 200) - 100;
          const d = (x - cx) / 3.2;
          if (d > -4 && d < 4) spike += Math.exp(-d * d) * (L.amp * 2.6) * (d < 0 ? -1 : 1);
        }
        const y = L.y + (v * (1 - focus * 0.94)) + spike * (0.35 + focus * 0.9);
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // crosshair at the focus point
    ctx.strokeStyle = `rgba(${LIME},0.5)`; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pointer.x - 10, pointer.y); ctx.lineTo(pointer.x - 4, pointer.y);
    ctx.moveTo(pointer.x + 4, pointer.y); ctx.lineTo(pointer.x + 10, pointer.y);
    ctx.moveTo(pointer.x, pointer.y - 10); ctx.lineTo(pointer.x, pointer.y - 4);
    ctx.moveTo(pointer.x, pointer.y + 4); ctx.lineTo(pointer.x, pointer.y + 10);
    ctx.stroke();

    if (running) raf = requestAnimationFrame(frame);
  }

  function setRunning(on) {
    if (on === running) return;
    running = on;
    if (on) raf = requestAnimationFrame(frame); else cancelAnimationFrame(raf);
  }

  const host = canvas.parentElement;
  host.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.tx = e.clientX - r.left; pointer.ty = e.clientY - r.top;
    pointer.live = true; pointer.lastMove = performance.now();
  });

  build();
  window.addEventListener("resize", () => { build(); if (!running) frame(); });

  if (reduced) { frame(); return { setRunning() {} }; }
  new IntersectionObserver(([e]) => setRunning(e.isIntersecting), { threshold: 0 }).observe(canvas);
  document.addEventListener("visibilitychange", () => setRunning(!document.hidden && canvas.getBoundingClientRect().bottom > 0));
  return { setRunning };
}
