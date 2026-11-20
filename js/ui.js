// Morceaux d'interface réutilisés : icônes, matériel, schémas du corps, vignettes, graphiques, cartes de séance.

import { MUSCLE_NAMES } from "./donnees.js";
import { html, raw, esc, jour, kg } from "./outils.js";

// ---------- Icônes au trait (prennent la couleur du texte) ----------
const ICONS = {
  calendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="4"/><path d="M8 2.5v4M16 2.5v4M3 10h18"/>',
  chart: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
  list: '<rect x="4" y="3.5" width="16" height="17.5" rx="3.5"/><path d="M8.5 9h7M8.5 13h7M8.5 17h4"/>',
  scale: '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M7.5 10.5a5 5 0 0 1 9 0"/><path d="M12 10.5l1.6-2.2"/>',
  left: '<path d="M15 18l-6-6 6-6"/>',
  right: '<path d="M9 18l6-6-6-6"/>',
  trophy: '<path d="M8 21h8M12 16.5V21M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5.5h3V7a3 3 0 0 1-3 3M7 5.5H4V7a3 3 0 0 0 3 3"/>',
  x: '<path d="M17 7L7 17M7 7l10 10"/>',
  barre: '<path d="M1.5 12h21"/><rect x="4.5" y="6.5" width="2.5" height="11" rx="1"/><rect x="17" y="6.5" width="2.5" height="11" rx="1"/><path d="M8.5 9v6M15.5 9v6"/>',
  haltere: '<path d="M9 12h6"/><rect x="3" y="7" width="3.5" height="10" rx="1.5"/><rect x="17.5" y="7" width="3.5" height="10" rx="1.5"/><path d="M6.5 9.5h2.5v5H6.5M17.5 9.5H15v5h2.5"/>',
  machine: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M6 9h12M6 13h12M6 17h12M12 2.5V9"/><circle cx="15.5" cy="11" r="0.6" fill="currentColor"/>',
  poulie: '<circle cx="12" cy="5" r="2.5"/><path d="M12 7.5v8.5M12 16l-4 3.5M12 16l4 3.5M7 19.5h10"/>',
  pdc: '<circle cx="12" cy="4.5" r="2"/><path d="M12 7.5v6.5M5.5 10l6.5-1.5 6.5 1.5M8.5 21l3.5-7 3.5 7"/>',
  kettlebell: '<path d="M9 9.2V7.5a3 3 0 0 1 6 0v1.7"/><circle cx="12" cy="15" r="6"/>',
  autre: '<circle cx="12" cy="12" r="9"/><circle cx="8" cy="12" r="0.8" fill="currentColor"/><circle cx="12" cy="12" r="0.8" fill="currentColor"/><circle cx="16" cy="12" r="0.8" fill="currentColor"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.25 4.1 1 5.8L12 16.9l-5.25 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  flame: '<path d="M12 21c-3.9 0-7-2.8-7-6.6 0-3.2 2.2-5.3 3.8-7.4.4 1.7 1.3 2.9 2.7 3.6C11.6 7.2 13 4.6 15.2 3c.3 2.9 3.8 5.6 3.8 11.4 0 3.8-3.1 6.6-7 6.6z"/>',
  save: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17"/>',
  upload: '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17"/>',
};

export function icon(name, size = 22) {
  return raw(`<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`);
}

// Petit logo du matériel + son nom
export function equip(name, label = true) {
  const key = { Barre: "barre", "Haltères": "haltere", Machine: "machine", Poulie: "poulie", "Poids du corps": "pdc", Kettlebell: "kettlebell" }[name] || "autre";
  return html`<span class="equip equip-${key}" title="${name || "Autre"}">${icon(key, 15)}${label ? name || "Autre" : ""}</span>`;
}

// ---------- Schémas du corps (formes : data/corps.json, licence MIT, voir LICENCES_TIERCES.md) ----------
let SHAPES = null;
export async function loadBody() {
  SHAPES = await (await fetch(new URL("../data/corps.json", import.meta.url))).json();
}
const VIEWS = [["face", "Face"], ["dos", "Dos"]];
export const SEXES = [["homme", "Homme"], ["femme", "Femme"]];
const MINI = {
  pectoraux: ["face", "haut"], epaules: ["face", "haut"], biceps: ["face", "haut"], avant_bras: ["face", "haut"],
  abdominaux: ["face", "haut"], dos: ["dos", "haut"], trapezes: ["dos", "haut"], triceps: ["dos", "haut"],
  lombaires: ["dos", "haut"], quadriceps: ["face", "bas"], adducteurs: ["face", "bas"], fessiers: ["dos", "bas"],
  ischios: ["dos", "bas"], mollets: ["dos", "bas"],
};
// Partie du dessin gardée pour chaque zoom : gauche, droite, haut, bas (en fraction)
const ZONES = { haut: [0.08, 0.92, 0.13, 0.50], bas: [0.22, 0.78, 0.40, 0.97] };

// Les deux vues du corps choisi, définies une fois et réutilisées par les petits schémas
export function bodySprite(sex) {
  const symbols = VIEWS.map(([view]) => {
    const v = SHAPES[sex][view];
    const paths = v.parts.map((p) => {
      const fill = p.m ? `var(--m-${p.m}, var(--muscle))` : p.k === "hair" ? "var(--hair)" : "var(--skin)";
      return `<path d="${p.d}" style="fill: ${fill}"/>`;
    }).join("");
    return `<symbol id="body-${view}" viewBox="${v.box}">${paths}</symbol>`;
  }).join("");
  return `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${symbols}</defs></svg>`;
}

// Petit schéma zoomé : muscle principal en couleur, secondaires en pâle
export function bodyMini(sex, primary, secondary = []) {
  const [view, zone] = MINI[primary] || ["face", "haut"];
  const [x, y, w, h] = SHAPES[sex][view].box.split(/\s+/).map(Number);
  const [l, r, t, b] = ZONES[zone];
  const box = `${x + w * l} ${y + h * t} ${w * (r - l)} ${h * (b - t)}`;
  const style = `--m-${primary}: var(--accent);` + secondary.map((s) => ` --m-${s}: var(--muscle-2nd);`).join("");
  return raw(`<span class="body-mini" aria-hidden="true"><svg viewBox="${box}" preserveAspectRatio="xMidYMid meet"><use href="#body-${view}" x="${x}" y="${y}" width="${w}" height="${h}" style="${esc(style)}"/></svg></span>`);
}

// Grand schéma cliquable : chaque muscle mène à ses exercices
export function bodyMap(sex, selected) {
  return raw(`<div class="body-map">${VIEWS.map(([view, label]) => {
    const v = SHAPES[sex][view];
    const decor = v.parts.filter((p) => !p.m).map((p) => `<path d="${p.d}" class="${p.k === "hair" ? "b-hair" : "b-skin"}"/>`).join("");
    const groups = {};
    for (const p of v.parts.filter((x) => x.m)) (groups[p.m] = groups[p.m] || []).push(p.d);
    const links = Object.entries(groups).map(([m, ds]) => {
      const href = m === selected ? "#/exercices" : `#/exercices?muscle=${m}`;
      return `<a href="${href}" class="b-link ${m === selected ? "on" : ""}"><title>${esc(MUSCLE_NAMES[m])}</title>${ds.map((d) => `<path d="${d}"/>`).join("")}</a>`;
    }).join("");
    return `<figure><svg viewBox="${v.box}" role="group" aria-label="Corps vu de ${label.toLowerCase()}">${decor}${links}</svg><figcaption>${label}</figcaption></figure>`;
  }).join("")}</div>`);
}

// Vignette d'un exercice : sa photo, avec le petit schéma du muscle en coin (ou le schéma seul)
export function thumb(sex, e) {
  const mini = bodyMini(sex, e.primary, e.secondary || []);
  if (!e.image) return mini;
  return html`<span class="thumb"><img src="img/exos/${e.image}/mini.jpg" alt="" loading="lazy" width="60" height="60">${mini}</span>`;
}

// ---------- Graphiques (dessinés par graphiques.js) + tableau des chiffres ----------
export function chartBlock(chart, title, { hidden = false, id = "" } = {}) {
  const pts = chart.points;
  return html`<div class="chart-wrap" ${id ? raw(`id="${esc(id)}"`) : ""} ${hidden ? raw("hidden") : ""}>
    <div class="chart" data-chart="${JSON.stringify(chart)}" role="img"
         aria-label="${title} : ${pts.length} valeurs, de ${pts[0].label} à ${pts[pts.length - 1].label}"></div>
    <details class="chart-table">
      <summary>Voir les chiffres</summary>
      <table>${[...pts].reverse().map((p) => html`<tr><td>${p.label}</td><td class="right">${kg(p.value)} ${chart.unit}</td></tr>`)}</table>
    </details>
  </div>`;
}

export function periodChips(periods, current, base) {
  const sep = base.includes("?") ? "&" : "?";
  return html`<nav class="chips" aria-label="Période">${periods.map(([key, label]) =>
    html`<a class="chip ${key === current ? "active" : ""}" href="${base}${sep}periode=${key}">${label}</a>`)}</nav>`;
}

// ---------- Carte d'une séance (historique, dernières séances) ----------
export function sessionCard(s, details) {
  return html`<a class="card session-card ${s.done ? "" : "is-planned"}" href="#/seance/${s.id}">
    <div class="row">
      <span><strong>${s.name}</strong><br><span class="muted small">${jour(s.day)}</span></span>
      ${s.done ? html`<span class="badge">${kg(details.tonnage)} kg</span>` : html`<span class="status">Prévue</span>`}
    </div>
    ${details.exercises.length
      ? html`<div class="mini">${details.exercises.map((e) => html`<span>${e.name} <em>${e.doneSets.length}/${e.sets.length}</em></span>`)}</div>`
      : html`<p class="muted small rest">Aucun exercice pour l'instant</p>`}
  </a>`;
}
