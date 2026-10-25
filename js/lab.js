// .lab charts: real FORM numbers (see LAB in data.js), drawn as plain SVG.
const NS = "http://www.w3.org/2000/svg";
const el = (tag, attrs = {}, parent) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
};
const SHADES = [1, 0.72, 0.5, 0.32, 0.18];

export function renderLab(LAB) {
  document.getElementById("labAsOf").textContent = `snapshot · ${LAB.asOf}`;
  demand(document.getElementById("demandChart"), LAB);
  weekly(document.getElementById("weekChart"), LAB);
  document.getElementById("weekLegend").innerHTML = LAB.parts
    .map(([name, max], i) => `<span><i class="sw" style="background:rgba(207,255,127,${SHADES[i]})"></i>${name} <span class="dim">/${max}</span></span>`).join("");
}

function demand(svg, LAB) {
  const W = 640, H = 270, L = 40, R = 14, T = 34, B = 30;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  const max = 550, n = LAB.sessions.length, bw = (W - L - R) / n;
  const y = (v) => T + (H - T - B) * (1 - v / max);
  for (let v = 0; v <= 500; v += 100) {
    el("line", { x1: L, x2: W - R, y1: y(v), y2: y(v), class: "grid" }, svg);
    el("text", { x: L - 8, y: y(v) + 4, class: "axis", "text-anchor": "end" }, svg).textContent = v;
  }
  const bars = el("g", { class: "bars" }, svg);
  LAB.sessions.forEach(([d, p, typ, rank], i) => {
    const x = L + i * bw + bw * 0.18, ratio = typ ? p / typ : null;
    const cls = ratio && ratio >= 1.1 ? "bar hot" : "bar";
    const r = el("rect", { x, y: y(p), width: bw * 0.64, height: y(0) - y(p), rx: 2, class: cls, style: `--d:${i * 25}ms` }, bars);
    el("title", {}, r).textContent = `${d}: demand ${p}${typ ? ` · usual ${typ} · ${ratio.toFixed(2)}×` : " · building baseline"} · rank ${rank} of ${n}${LAB.notes[d] ? ` · ${LAB.notes[d]}` : ""}`;
    if (i % 3 === 0 || i === n - 1) el("text", { x: x + bw * 0.32, y: H - 10, class: "axis", "text-anchor": "middle" }, svg).textContent = d.replace("-", "/");
  });
  // rolling median (the "usual" each session is compared against)
  let path = "";
  LAB.sessions.forEach(([, , typ], i) => { if (typ == null) return; const x = L + i * bw + bw / 2; path += (path ? "L" : "M") + `${x},${y(typ)}`; });
  el("path", { d: path, class: "median" }, svg);
  // annotate the top session
  const top = LAB.sessions.reduce((a, b) => (b[1] > a[1] ? b : a));
  const ti = LAB.sessions.indexOf(top), tx = L + ti * bw + bw / 2;
  const note = el("text", { x: tx - 6, y: y(top[1]) - 10, class: "note", "text-anchor": "end" }, svg);
  note.textContent = `#1 · ${LAB.notes[top[0]] || top[0]} · ${(top[1] / top[2]).toFixed(1)}× usual`;
}

function weekly(svg, LAB) {
  const W = 400, H = 270, L = 34, R = 10, T = 30, B = 30;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  const y = (v) => T + (H - T - B) * (1 - v / 100);
  for (let v = 0; v <= 100; v += 25) {
    el("line", { x1: L, x2: W - R, y1: y(v), y2: y(v), class: "grid" }, svg);
    el("text", { x: L - 8, y: y(v) + 4, class: "axis", "text-anchor": "end" }, svg).textContent = v;
  }
  const n = LAB.weeks.length, slot = (W - L - R) / n, bw = slot * 0.56;
  LAB.weeks.forEach((w, i) => {
    const x = L + i * slot + (slot - bw) / 2;
    let acc = 0;
    const g = el("g", { class: "stack", style: `--d:${i * 90}ms` }, svg);
    w.parts.forEach((v, k) => {
      const r = el("rect", { x, y: y(acc + v), width: bw, height: y(acc) - y(acc + v), fill: `rgba(207,255,127,${SHADES[k]})` }, g);
      el("title", {}, r).textContent = `${w.wk}: ${LAB.parts[k][0]} ${+v.toFixed(2)} of ${LAB.parts[k][1]}`;
      acc += v;
    });
    el("text", { x: x + bw / 2, y: y(acc) - 8, class: "total", "text-anchor": "middle" }, svg).textContent = Math.round(acc);
    el("text", { x: x + bw / 2, y: H - 10, class: "axis", "text-anchor": "middle" }, svg).textContent = w.wk;
  });
}
