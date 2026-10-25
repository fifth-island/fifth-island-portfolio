import { PROFILE, PROJECTS, CATEGORIES, COMMITS, LANES, STACK, HONORS, LAB } from "./data.js";
import { startSignal } from "./signal.js";
import { drawCover } from "./covers.js";
import { initCoda } from "./coda.js";
import { renderGitLog } from "./gitlog.js";
import { renderLab } from "./lab.js";

document.documentElement.classList.add("js");
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------------- hero ---------------- */
startSignal($("#signal"), { reduced });

/* ---------------- nav: scrolled state + active section ---------------- */
const nav = $("#nav");
const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 40);
window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
const links = [...document.querySelectorAll(".nav nav a")];
const sectionIO = new IntersectionObserver((es) => es.forEach((e) => {
  if (e.isIntersecting) links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id));
}), { rootMargin: "-45% 0px -50% 0px" });
["readme", "work", "research", "lab", "projects", "log", "contact"].forEach((id) => sectionIO.observe(document.getElementById(id)));

/* ---------------- reveal on scroll ---------------- */
const revealIO = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); revealIO.unobserve(e.target); } }), { threshold: 0.12 });
document.querySelectorAll(".reveal").forEach((el) => revealIO.observe(el));

/* ---------------- readme: honors marquee + count-up ---------------- */
const track = $("#honors");
track.innerHTML = [...HONORS, ...HONORS].map((h, i) => `<span${i >= HONORS.length ? ' aria-hidden="true"' : ""}>${esc(h)}</span>`).join("");
const countIO = new IntersectionObserver((es) => es.forEach((e) => {
  if (!e.isIntersecting) return; countIO.unobserve(e.target);
  const el = e.target, end = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0);
  if (reduced) return;
  const t0 = performance.now(), dur = 1100;
  const tick = (now) => { const p = Math.min(1, (now - t0) / dur), v = end * (1 - Math.pow(1 - p, 3)); el.textContent = v.toFixed(dec); if (p < 1) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}), { threshold: 0.6 });
document.querySelectorAll("[data-count]").forEach((el) => countIO.observe(el));

/* ---------------- work: capture → record pipeline ---------------- */
(function pipeline() {
  const svg = $("#pipeline"), NS = "http://www.w3.org/2000/svg";
  const nodes = [
    { id: "glasses", x: 10, y: 14, w: 186, t: "AR glasses", s: "photos · clips · steps" },
    { id: "cams", x: 10, y: 92, w: 186, t: "cameras + files", s: "OCR · tables · printouts" },
    { id: "voice", x: 10, y: 170, w: 186, t: "voice agent", s: "LiveKit · narrates steps" },
    { id: "log", x: 268, y: 92, w: 196, t: "event log", s: "append-only · who/what/when", hot: true },
    { id: "attr", x: 520, y: 92, w: 196, t: "step attribution", s: "interval overlap · EXIF time", hot: true },
    { id: "steps", x: 770, y: 14, w: 180, t: "protocol steps", s: "every capture placed" },
    { id: "reports", x: 770, y: 92, w: 180, t: "AI reports", s: "Claude · 128k-token fill" },
    { id: "registry", x: 770, y: 170, w: 180, t: "registry", s: "multi-tenant records" },
  ];
  const H = 46, byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const right = (n) => [n.x + n.w, n.y + H / 2], left = (n) => [n.x, n.y + H / 2];
  const wire = (a, b, dashed) => {
    const [x1, y1] = right(byId[a]), [x2, y2] = left(byId[b]), mx = (x1 + x2) / 2;
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`); p.setAttribute("class", "wire");
    if (dashed) p.setAttribute("stroke-dasharray", "4 5");
    svg.appendChild(p); return p;
  };
  const wires = [["glasses", "log"], ["cams", "log"], ["voice", "log"], ["log", "attr"], ["attr", "steps"], ["attr", "reports"], ["attr", "registry"]].map(([a, b]) => wire(a, b));
  // feedback: step state flows back to the voice agent
  const fb = document.createElementNS(NS, "path");
  fb.setAttribute("d", `M${byId.attr.x + byId.attr.w / 2},${byId.attr.y + H} C${byId.attr.x + 60},226 ${byId.voice.x + byId.voice.w + 60},226 ${byId.voice.x + byId.voice.w},${byId.voice.y + H * .75}`);
  fb.setAttribute("class", "wire"); fb.setAttribute("stroke-dasharray", "4 5"); svg.appendChild(fb);
  const lbl = document.createElementNS(NS, "text"); lbl.setAttribute("x", 330); lbl.setAttribute("y", 222); lbl.setAttribute("class", "sub"); lbl.textContent = "step state ↺ back to the agent"; svg.appendChild(lbl);
  nodes.forEach((n) => {
    const g = document.createElementNS(NS, "g"); g.setAttribute("class", "node" + (n.hot ? " hot" : ""));
    g.innerHTML = `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${H}" rx="9"></rect><text x="${n.x + 14}" y="${n.y + 20}">${n.t}</text><text class="sub" x="${n.x + 14}" y="${n.y + 36}">${n.s}</text>`;
    svg.appendChild(g);
  });
  if (reduced) return;
  [...wires, fb].forEach((p, i) => {
    const c = document.createElementNS(NS, "circle"); c.setAttribute("r", 3); c.setAttribute("class", "packet");
    c.innerHTML = `<animateMotion dur="${2.2 + (i % 3) * 0.5}s" begin="${i * 0.35}s" repeatCount="indefinite" path="${p.getAttribute("d")}"/>`;
    svg.appendChild(c);
  });
})();

/* ---------------- research ---------------- */
const coda = initCoda($("#coda"), { reduced });

/* ---------------- lab (FORM) ---------------- */
renderLab(LAB);

/* ---------------- projects ---------------- */
const grid = $("#grid"), filtersEl = $("#filters");
let filter = "all";
grid.innerHTML = PROJECTS.map((p, i) => `
  <button class="card reveal" data-id="${p.id}" data-i="${i}" aria-label="${esc(p.title)}: open details">
    <div class="cover"><canvas data-cover="${p.cover}" data-seed="${p.id}"></canvas><span class="yr">${p.year}</span>${p.award ? `<span class="award">${esc(p.award)}</span>` : ""}</div>
    <div class="cbody">
      <span class="ctx">${esc(p.context)}</span>
      <h4>${esc(p.title)}</h4>
      <p>${esc(p.blurb)}</p>
      <div class="tags mono">${p.tags.slice(0, 4).map((t) => `<span>${esc(t)}</span>`).join("")}</div>
      <span class="more">open →</span>
    </div>
  </button>`).join("");
const cards = [...grid.querySelectorAll(".card")];
cards.forEach((c) => revealIO.observe(c));

function paintCovers() { grid.querySelectorAll("canvas[data-cover]").forEach((cv) => { if (cv.offsetParent) drawCover(cv, cv.dataset.cover, cv.dataset.seed); }); }
function applyFilter() {
  let shown = 0;
  cards.forEach((c) => {
    const p = PROJECTS[c.dataset.i], on = filter === "all" || p.cat.includes(filter);
    c.hidden = !on; c.classList.toggle("big", on && filter === "all" && shown < 2 && window.innerWidth > 980);
    if (on) { shown++; c.classList.add("in"); }
  });
  filtersEl.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.f === filter)));
  requestAnimationFrame(paintCovers);
}
filtersEl.innerHTML = CATEGORIES.map((c) => {
  const n = c.k === "all" ? PROJECTS.length : PROJECTS.filter((p) => p.cat.includes(c.k)).length;
  return `<button data-f="${c.k}" aria-pressed="${c.k === filter}">${c.label}<span class="count">${n}</span></button>`;
}).join("");
filtersEl.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; filter = b.dataset.f; applyFilter(); });
applyFilter();
document.fonts?.ready.then(paintCovers);
let resizeT; window.addEventListener("resize", () => { clearTimeout(resizeT); resizeT = setTimeout(applyFilter, 150); });

/* modal */
const modal = $("#modal");
let lastFocus = null;
function openProject(id) {
  const p = PROJECTS.find((x) => x.id === id); if (!p) return;
  lastFocus = document.activeElement;
  $("#mContext").textContent = `${p.context} · ${p.year}`;
  $("#mTitle").textContent = p.title;
  const aw = $("#mAward"); aw.hidden = !p.award; aw.textContent = p.award || "";
  $("#mBody").textContent = p.body;
  $("#mMetrics").innerHTML = p.metrics.map(([v, k]) => `<div><dd>${esc(v)}</dd><dt>${esc(k)}</dt></div>`).join("");
  $("#mTags").innerHTML = p.tags.map((t) => `<span>${esc(t)}</span>`).join("");
  $("#mLinks").innerHTML = p.links.map(([l, u], i) => u.startsWith("#") ? `<a class="btn small${i ? "" : " solid"} inpage" href="${esc(u)}">${esc(l)} ↓</a>` : `<a class="btn small${i ? "" : " solid"}" href="${esc(u)}" target="_blank" rel="noopener">${esc(l)} ↗</a>`).join("") || `<span class="mono tiny">No public link: ask me about it.</span>`;
  const media = $("#mMedia");
  media.innerHTML = p.images.length ? p.images.map((src) => `<img src="${esc(src)}" alt="${esc(p.title)} screenshot" loading="lazy">`).join("") : `<canvas data-cover="${p.cover}"></canvas>`;
  modal.hidden = false; document.body.style.overflow = "hidden";
  const cv = media.querySelector("canvas"); if (cv) requestAnimationFrame(() => drawCover(cv, p.cover, p.id));
  $("#mClose").focus();
}
function closeModal() { modal.hidden = true; document.body.style.overflow = ""; lastFocus?.focus(); }
grid.addEventListener("click", (e) => { const c = e.target.closest(".card"); if (c) openProject(c.dataset.id); });
$("#mClose").addEventListener("click", closeModal);
$("#mLinks").addEventListener("click", (e) => { if (e.target.closest(".inpage")) closeModal(); });
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

/* live GitHub feed (public API, silently skipped if unavailable) */
(function githubFeed() {
  const box = $("#gh"), list = $("#ghList");
  const ago = (d) => { const days = Math.round((Date.now() - new Date(d)) / 864e5); return days < 1 ? "today" : days < 30 ? `${days}d ago` : days < 365 ? `${Math.round(days / 30)}mo ago` : `${Math.round(days / 365)}y ago`; };
  const io = new IntersectionObserver(async ([e]) => {
    if (!e.isIntersecting) return; io.disconnect();
    try {
      const res = await fetch("https://api.github.com/users/fifth-island/repos?sort=pushed&per_page=20", { headers: { Accept: "application/vnd.github+json" } });
      if (!res.ok) return;
      const repos = (await res.json()).filter((r) => !r.fork && r.name !== "fifth-island-portfolio").slice(0, 8);
      if (!repos.length) return;
      list.innerHTML = repos.map((r) => `<li><a href="${esc(r.html_url)}" target="_blank" rel="noopener"><b>${esc(r.name)}</b><span>${esc(r.language || "—")} · ${ago(r.pushed_at)}</span></a></li>`).join("");
      box.hidden = false; requestAnimationFrame(() => box.classList.add("in"));
    } catch (_) { /* offline or rate-limited: leave hidden */ }
  }, { rootMargin: "300px" });
  io.observe($("#projects"));
})();

/* ---------------- log + stack ---------------- */
renderGitLog($("#gitlog"), $("#lanes"), COMMITS, LANES);
$("#stackGrid").innerHTML = STACK.map(([k, items]) => `<div><h4>${esc(k)}</h4><ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></div>`).join("");

/* ---------------- contact ---------------- */
$("#year").textContent = new Date().getFullYear();
const toast = $("#toast");
async function copyEmail() {
  try { await navigator.clipboard.writeText(PROFILE.email); toast.textContent = "Email copied. Talk soon."; }
  catch (_) { toast.textContent = PROFILE.email; }
  setTimeout(() => (toast.textContent = ""), 3200);
}
$("#copyEmail").addEventListener("click", copyEmail);
(function typeHeading() {
  const h = $("#ctaHeading"), text = h.textContent;
  if (reduced) return;
  h.textContent = "";
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return; io.disconnect();
    h.classList.add("typing"); let i = 0;
    const tick = () => { h.textContent = text.slice(0, ++i); if (i < text.length) setTimeout(tick, 55); else setTimeout(() => h.classList.remove("typing"), 1400); };
    tick();
  }, { threshold: 0.5 });
  io.observe(h);
})();

/* ---------------- command palette ---------------- */
const palette = $("#palette"), pInput = $("#pInput"), pList = $("#pList");
const go = (id) => () => document.getElementById(id).scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
const COMMANDS = [
  { t: "readme", d: "about me", run: go("readme") },
  { t: "work", d: "Dimenso · Tesla · DLR", run: go("work") },
  { t: "research", d: "sperm whale codas", run: go("research") },
  { t: "lab", d: "FORM · my training as a dataset", run: go("lab") },
  { t: "projects", d: `${PROJECTS.length} builds`, run: go("projects") },
  { t: "log", d: "career as git log", run: go("log") },
  { t: "stack", d: "tools I use", run: go("stack") },
  { t: "contact", d: "say hi", run: go("contact") },
  { t: "resume", d: "download PDF", run: () => { const a = document.createElement("a"); a.href = PROFILE.resume; a.download = "joao_resume.pdf"; a.click(); } },
  { t: "copy email", d: PROFILE.email, run: () => { go("contact")(); copyEmail(); } },
  { t: "github", d: "fifth-island", run: () => window.open(PROFILE.github, "_blank", "noopener") },
  { t: "linkedin", d: "joaoquintanilha", run: () => window.open(PROFILE.linkedin, "_blank", "noopener") },
  { t: "coda", d: "play a sperm whale coda", run: () => { go("research")(); setTimeout(() => coda.play(), reduced ? 0 : 700); } },
  ...PROJECTS.map((p) => ({ t: `open ${p.title.toLowerCase()}`, d: p.year, run: () => openProject(p.id) })),
];
let pItems = [], pSel = 0;
function renderPalette() {
  const q = pInput.value.trim().toLowerCase();
  pItems = COMMANDS.filter((c) => !q || (c.t + " " + c.d).toLowerCase().includes(q)).slice(0, 12);
  pSel = Math.min(pSel, Math.max(0, pItems.length - 1));
  pList.innerHTML = pItems.map((c, i) => `<li role="option" aria-selected="${i === pSel}" data-i="${i}">${esc(c.t)}<small>${esc(c.d)}</small></li>`).join("") || `<li>no match. try “projects” or “coda”</li>`;
}
function openPalette() { lastFocus = document.activeElement; palette.hidden = false; pInput.value = ""; pSel = 0; renderPalette(); pInput.focus(); }
function closePalette() { palette.hidden = true; lastFocus?.focus(); }
function runSel() { const c = pItems[pSel]; if (!c) return; closePalette(); c.run(); }
$("#openPalette").addEventListener("click", openPalette);
pInput.addEventListener("input", () => { pSel = 0; renderPalette(); });
pList.addEventListener("click", (e) => { const li = e.target.closest("li[data-i]"); if (li) { pSel = +li.dataset.i; runSel(); } });
palette.addEventListener("click", (e) => { if (e.target === palette) closePalette(); });
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); palette.hidden ? openPalette() : closePalette(); return; }
  if (e.key === "Escape") { if (!palette.hidden) closePalette(); else if (!modal.hidden) closeModal(); return; }
  if (!palette.hidden) {
    if (e.key === "ArrowDown") { e.preventDefault(); pSel = (pSel + 1) % Math.max(1, pItems.length); renderPalette(); }
    if (e.key === "ArrowUp") { e.preventDefault(); pSel = (pSel - 1 + pItems.length) % Math.max(1, pItems.length); renderPalette(); }
    if (e.key === "Enter") { e.preventDefault(); runSel(); }
  }
  if (e.key === "/" && palette.hidden && modal.hidden && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); openPalette(); }
});
