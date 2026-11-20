// Graphiques en SVG, sans bibliothèque externe.
// Chaque <div class="chart" data-chart='{"type": "line"|"bar", "unit": "kg", "points": [...]}'> est dessiné ici.

const NS = "http://www.w3.org/2000/svg";
const HEIGHT = 210;
const M = { top: 14, right: 14, bottom: 26, left: 46 };

const fmt = (v) => v.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
const fmtAxis = (v) => (Math.abs(v) >= 10000 ? fmt(v / 1000) + " k" : fmt(v));

const el = (name, attrs = {}, parent) => {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.appendChild(node);
  return node;
};

// Graduations « rondes » (1, 2, 2,5, 5 × 10^n) qui couvrent [lo, hi]
function niceTicks(lo, hi, count = 4) {
  if (lo === hi) { lo -= 1; hi += 1; }
  const raw = (hi - lo) / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((s) => s >= raw);
  const start = Math.floor(lo / step) * step;
  const ticks = [];
  for (let t = start; t <= hi + step * 0.5; t += step) ticks.push(Math.round(t * 1000) / 1000);
  while (ticks.length > 1 && ticks[ticks.length - 2] >= hi) ticks.pop();
  return ticks;
}

let uid = 0;

export function render(box) {
  const data = JSON.parse(box.dataset.chart);
  const width = box.clientWidth;
  if (!width || !data.points.length) return;
  box.innerHTML = "";

  const pts = data.points;
  const isBar = data.type === "bar";
  const values = pts.map((p) => p.value);
  const fromZero = isBar || data.zero;  // le tonnage part de 0 ; le poids ou la charge, non
  let lo = fromZero ? 0 : Math.min(...values);
  let hi = Math.max(...values);
  if (!fromZero) { const pad = (hi - lo) * 0.15 || Math.max(1, hi * 0.05); lo = Math.max(0, lo - pad); hi += pad; }
  const ticks = niceTicks(lo, hi || 1);
  const y0 = ticks[0], y1 = ticks[ticks.length - 1];
  const plotW = width - M.left - M.right;
  const plotH = HEIGHT - M.top - M.bottom;
  const y = (v) => M.top + plotH - ((v - y0) / (y1 - y0)) * plotH;

  // Position horizontale : par date pour une courbe, en colonnes pour des barres
  let x, band = 0;
  if (isBar) {
    band = plotW / pts.length;
    x = (i) => M.left + band * (i + 0.5);
  } else {
    const times = pts.map((p) => Date.parse(p.date));
    const t0 = times[0], t1 = times[times.length - 1];
    x = (i) => (t1 === t0 ? M.left + plotW / 2 : M.left + ((times[i] - t0) / (t1 - t0)) * plotW);
  }

  const svg = el("svg", { width, height: HEIGHT, viewBox: `0 0 ${width} ${HEIGHT}`, "aria-hidden": "true" }, box);

  // Dégradés : barres (orange clair -> orange vif) et zone sous la courbe (orange -> transparent)
  const gid = `g${++uid}`;
  const css = getComputedStyle(document.documentElement);
  const colA = css.getPropertyValue("--chart-a").trim() || "#d6ff5c";
  const colB = css.getPropertyValue("--chart-b").trim() || "#a6e01c";
  const defs = el("defs", {}, svg);
  const barGrad = el("linearGradient", { id: `${gid}b`, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  el("stop", { offset: "0%", "stop-color": colA }, barGrad);
  el("stop", { offset: "100%", "stop-color": colB }, barGrad);
  const areaGrad = el("linearGradient", { id: `${gid}a`, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  el("stop", { offset: "0%", "stop-color": colB, "stop-opacity": 0.3 }, areaGrad);
  el("stop", { offset: "100%", "stop-color": colB, "stop-opacity": 0 }, areaGrad);

  // Grille et axe vertical (discrets)
  for (const t of ticks) {
    el("line", { x1: M.left, x2: width - M.right, y1: y(t), y2: y(t), class: t === y0 ? "c-axis" : "c-grid" }, svg);
    el("text", { x: M.left - 8, y: y(t) + 4, "text-anchor": "end", class: "c-label" }, svg).textContent = fmtAxis(t);
  }

  // Étiquettes de l'axe horizontal : la dernière toujours, les autres seulement s'il y a la place (72 px)
  const GAP = 72;
  const chosen = [pts.length - 1];
  for (let i = 0; i < pts.length - 1; i++) {
    const prev = chosen.length > 1 ? chosen[chosen.length - 1] : null;
    if (x(pts.length - 1) - x(i) < GAP) break;
    if (prev === null || x(i) - x(prev) >= GAP) chosen.push(i);
  }
  chosen.forEach((i) => {
    const p = pts[i];
    const isLast = i === pts.length - 1;
    const anchor = pts.length === 1 ? "middle" : i === 0 && !isBar ? "start" : isLast && !isBar ? "end" : "middle";
    el("text", { x: x(i), y: HEIGHT - 6, "text-anchor": anchor, class: "c-label" }, svg).textContent = p.short || p.label;
  });

  // Données
  const marks = [];
  if (isBar) {
    const gap = Math.max(2, band * 0.25);
    const w = Math.max(2, band - gap);
    pts.forEach((p, i) => {
      const top = y(p.value), base = y(y0), h = base - top;
      const r = Math.min(4, w / 2, h);
      const left = x(i) - w / 2;
      const d = h <= 0 ? "" :
        `M${left},${base} V${top + r} Q${left},${top} ${left + r},${top} H${left + w - r} Q${left + w},${top} ${left + w},${top + r} V${base} Z`;
      marks.push(el("path", { d, class: "c-bar", fill: `url(#${gid}b)` }, svg));
    });
  } else {
    const d = pts.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.value)}`).join(" ");
    if (pts.length > 1) {
      el("path", { d: `${d} L${x(pts.length - 1)},${y(y0)} L${x(0)},${y(y0)} Z`, class: "c-area", fill: `url(#${gid}a)` }, svg);
    }
    el("path", { d, class: "c-line" }, svg);
    const showDots = pts.length <= 40;
    pts.forEach((p, i) => {
      marks.push(el("circle", { cx: x(i), cy: y(p.value), r: showDots ? 4 : 0, class: "c-dot" }, svg));
    });
  }

  // Survol / toucher : repère + infobulle sur le point le plus proche
  const cross = el("line", { y1: M.top, y2: M.top + plotH, class: "c-cross", visibility: "hidden" }, svg);
  const tip = document.createElement("div");
  tip.className = "chart-tip";
  tip.hidden = true;
  box.appendChild(tip);
  const hit = el("rect", { x: M.left, y: 0, width: plotW, height: HEIGHT, fill: "transparent" }, svg);

  let active = -1;
  const show = (evt) => {
    const px = evt.clientX - svg.getBoundingClientRect().left;
    let best = 0;
    pts.forEach((_, i) => { if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i; });
    if (best !== active) {
      if (active >= 0) marks[active].classList.remove("on");
      marks[best].classList.add("on");
      active = best;
    }
    const p = pts[best];
    if (!isBar) cross.setAttribute("visibility", "visible");
    cross.setAttribute("x1", x(best));
    cross.setAttribute("x2", x(best));
    tip.innerHTML = `<span>${p.label}</span><strong>${fmt(p.value)} ${data.unit}</strong>`;
    tip.hidden = false;
    const tw = tip.offsetWidth;
    tip.style.left = Math.min(Math.max(0, x(best) - tw / 2), width - tw) + "px";
    tip.style.top = Math.max(0, y(p.value) - tip.offsetHeight - 12) + "px";
  };
  const hide = () => {
    tip.hidden = true;
    cross.setAttribute("visibility", "hidden");
    if (active >= 0) marks[active].classList.remove("on");
    active = -1;
  };
  hit.addEventListener("pointermove", show);
  hit.addEventListener("pointerdown", show);
  hit.addEventListener("pointerleave", (evt) => { if (evt.pointerType === "mouse") hide(); });
}


// Dessine tous les graphiques visibles d'une page et branche les onglets (Charge max / 1RM / Tonnage)
export function renderCharts(root) {
  root.querySelectorAll(".chart[data-chart]").forEach(render);
  root.querySelectorAll("[data-tabs]").forEach((tabs) => {
    tabs.querySelectorAll("[data-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        tabs.querySelectorAll("[data-tab]").forEach((b) => {
          b.classList.toggle("active", b === btn);
          document.getElementById(b.dataset.tab).hidden = b !== btn;
        });
        render(document.querySelector(`#${btn.dataset.tab} .chart`));
      });
    });
  });
}

// Redessiner quand la largeur change (rotation du téléphone, fenêtre redimensionnée)
let lastWidth = window.innerWidth;
window.addEventListener("resize", () => {
  if (window.innerWidth === lastWidth) return;
  lastWidth = window.innerWidth;
  document.querySelectorAll(".chart[data-chart]").forEach(render);
});
