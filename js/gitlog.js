// Career rendered as `git log --graph`: commits are rows, lanes are branches
// (engineering / research / design / community), with branch and merge curves.

const LANE_COLORS = ["#cfff7f", "#7fe3ff", "#ffb86b", "#c9a7ff"];

function hash(s) { // stable fake short hash per commit message
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0).toString(16).padStart(8, "0").slice(0, 7);
}

export function renderGitLog(root, lanesEl, commits, lanes) {
  lanesEl.innerHTML = lanes.map((l, i) => `<span><i style="background:${LANE_COLORS[i]}"></i>${l.name}${l.label !== l.name ? `<span class="dim">(${l.label})</span>` : ""}</span>`).join("");
  root.innerHTML = commits.map((c, i) => `
    <div class="commit" data-i="${i}">
      <span class="graph-cell"></span>
      <span class="hash">${hash(c.msg)}</span>
      <span class="msg">${c.head ? '<span class="ref">HEAD → main</span>' : ""}<span class="type">${c.type}:</span> ${c.msg}<span class="yr">${c.y}</span><span class="sub">${c.sub}</span></span>
    </div>`).join("");

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  root.prepend(svg);

  function draw() {
    const small = window.innerWidth < 760;
    const gap = small ? 18 : 24, x0 = small ? 12 : 16;
    root.style.setProperty("--graph-w", `${x0 * 2 + gap * (lanes.length - 1) + 8}px`);
    const rows = [...root.querySelectorAll(".commit")];
    const Y = rows.map((r) => r.offsetTop + 14);
    const X = (lane) => x0 + lane * gap;
    svg.setAttribute("width", X(lanes.length - 1) + x0);
    svg.setAttribute("height", root.scrollHeight);
    svg.innerHTML = "";
    const path = (d, color) => { const p = document.createElementNS(svgNS, "path"); p.setAttribute("d", d); p.setAttribute("class", "edge"); p.setAttribute("stroke", color); svg.appendChild(p); return p; };
    const curve = (xa, ya, xb, yb) => `M${xa},${ya} C${xa},${(ya + yb) / 2} ${xb},${(ya + yb) / 2} ${xb},${yb}`;

    // straight segments between consecutive commits of the same lane
    lanes.forEach((_, lane) => {
      const idx = commits.map((c, i) => (c.lane === lane ? i : -1)).filter((i) => i >= 0);
      for (let k = 0; k < idx.length - 1; k++) path(`M${X(lane)},${Y[idx[k]]} L${X(lane)},${Y[idx[k + 1]]}`, LANE_COLORS[lane]);
    });
    commits.forEach((c, i) => {
      const col = LANE_COLORS[c.lane];
      if (c.merge !== undefined) { // merge up into the previous commit of the target lane
        const j = [...commits.keys()].filter((k) => k < i && commits[k].lane === c.merge).pop();
        if (j !== undefined) path(curve(X(c.lane), Y[i], X(c.merge), Y[j]), col);
      }
      if (c.branch !== undefined) { // branched off the next commit below on the parent lane
        const j = [...commits.keys()].find((k) => k > i && commits[k].lane === c.branch);
        const lowest = commits.map((cc, k) => (cc.lane === c.lane ? k : -1)).filter((k) => k >= 0).pop();
        if (j !== undefined && lowest === i) path(curve(X(c.lane), Y[i], X(c.branch), Y[j]), col);
      }
      if (c.mergeFrom !== undefined) { // a side lane that merges into this commit
        const j = [...commits.keys()].find((k) => k > i && commits[k].lane === c.mergeFrom);
        if (j !== undefined) path(curve(X(c.mergeFrom), Y[j], X(c.lane), Y[i]), LANE_COLORS[c.mergeFrom]);
      }
      if (c.open) path(`M${X(c.lane)},${Y[i]} L${X(c.lane)},${Y[0] - 14}`, col).setAttribute("stroke-dasharray", "3 5");
    });
    commits.forEach((c, i) => {
      const d = document.createElementNS(svgNS, "circle");
      d.setAttribute("cx", X(c.lane)); d.setAttribute("cy", Y[i]); d.setAttribute("r", c.head ? 7 : 5.5);
      d.setAttribute("class", "dot" + (c.head ? " head" : "")); d.setAttribute("stroke", LANE_COLORS[c.lane]);
      svg.appendChild(d);
    });
  }

  draw();
  let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(draw, 100); });
  document.fonts?.ready.then(draw);

  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.4 });
  root.querySelectorAll(".commit").forEach((r, i) => { r.style.transitionDelay = `${(i % 4) * 60}ms`; io.observe(r); });
}
