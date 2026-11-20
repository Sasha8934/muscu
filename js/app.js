// Muscu : point d'entrée. Navigation par « # » (comme Syrinx), affichage des pages, gestes.

import { load, save, state, findSet } from "./store.js";
import { forms, clicks, changes, setApp, moveSessionTo } from "./actions.js";
import { renderCharts } from "./graphiques.js";
import { esc, parseKg } from "./outils.js";
import { bodySprite, icon, loadBody } from "./ui.js";
import { vueSemaine } from "./vues/semaine.js";
import { vueChoixExercice, vueHistorique, vueNouvelle, vueSeance } from "./vues/seances.js";
import { vueFiche, vueFormExercice, vueGuide } from "./vues/exercices.js";
import { vueFormType, vueProgramme } from "./vues/programme.js";
import { vuePoids, vueProgres, vueProgresExercice, vueProgresMuscle } from "./vues/progres.js";

const main = document.getElementById("app");
const spriteBox = document.getElementById("sprite");
let flashes = [];
let lastRoute = "";

// ---------- Pages ----------
const ROUTES = [
  [/^\/$/, vueSemaine],
  [/^\/seances$/, vueHistorique],
  [/^\/seance\/nouvelle$/, vueNouvelle],
  [/^\/seance\/(?<id>\d+)$/, vueSeance],
  [/^\/seance\/(?<id>\d+)\/exercices$/, vueChoixExercice],
  [/^\/exercices$/, vueGuide],
  [/^\/exercice\/nouveau$/, vueFormExercice],
  [/^\/exercice\/(?<id>\d+)$/, vueFiche],
  [/^\/exercice\/(?<id>\d+)\/modifier$/, vueFormExercice],
  [/^\/programme$/, vueProgramme],
  [/^\/programme\/nouveau$/, vueFormType],
  [/^\/programme\/(?<id>\d+)$/, vueFormType],
  [/^\/progres$/, vueProgres],
  [/^\/progres\/exercice\/(?<id>\d+)$/, vueProgresExercice],
  [/^\/progres\/muscle\/(?<muscle>[a-z_]+)$/, vueProgresMuscle],
  [/^\/poids$/, vuePoids],
];

function parseHash() {
  const hash = location.hash.replace(/^#/, "") || "/";
  const [path, query = ""] = hash.split("?");
  return { path: path || "/", params: Object.fromEntries(new URLSearchParams(query)) };
}

function render({ keepScroll = false } = {}) {
  const { path, params } = parseHash();
  let view = null;
  for (const [re, fn] of ROUTES) {
    const m = re.exec(path);
    if (m) { view = fn({ ...params, ...(m.groups || {}) }, { sex: state.settings.corps }); break; }
  }
  if (!view) view = { title: "Introuvable", nav: "", body: `<h1>Page introuvable</h1><p><a href="#/">Retour à l'accueil</a></p>` };

  const y = window.scrollY;
  let messages = flashes.map(([m, kind]) => `<div class="flash ${kind}">${esc(m)}</div>`).join("");
  flashes = [];
  if (messages && keepScroll) { showToast(messages); messages = ""; } // on reste au même endroit : bandeau flottant
  main.innerHTML = messages + String(view.body);
  document.title = `${view.title} · Muscu`;
  document.querySelectorAll("[data-nav]").forEach((a) => a.classList.toggle("active", a.dataset.nav === view.nav));
  bind(main);
  renderCharts(main);

  const route = location.hash;
  if (keepScroll) window.scrollTo(0, y);
  else if (params.ex && document.getElementById(`ex-${params.ex}`)) document.getElementById(`ex-${params.ex}`).scrollIntoView();
  else if (route !== lastRoute) window.scrollTo(0, 0);
  if (messages && !keepScroll) window.scrollTo(0, 0);
  lastRoute = route;
}

let toastTimer = null;
function showToast(content) {
  const box = document.getElementById("toast");
  box.innerHTML = content;
  box.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { box.hidden = true; }, 3500);
}

const app = {
  go(hash) { if (location.hash === hash) render(); else location.hash = hash; },
  rerender({ body = false } = {}) {
    if (body) spriteBox.innerHTML = bodySprite(state.settings.corps);
    render({ keepScroll: true });
  },
  flash(message, kind = "") {
    flashes.push([message, kind]);
    if (kind === "error") render({ keepScroll: true });
  },
};
setApp(app);

// ---------- Formulaires et boutons (une seule écoute pour toute l'appli) ----------
main.addEventListener("submit", (e) => {
  const form = e.target.closest("form[data-action]");
  if (!form) return;
  e.preventDefault();
  if (form.dataset.confirm && !confirm(form.dataset.confirm)) return;
  forms[form.dataset.action]?.(new FormData(form), form);
});

main.addEventListener("click", (e) => {
  const el = e.target.closest("[data-click]");
  if (el) {
    e.preventDefault();
    if (el.dataset.confirm && !confirm(el.dataset.confirm)) return;
    clicks[el.dataset.click]?.(el);
    return;
  }
  const jump = e.target.closest("[data-scroll]");
  if (jump && !jump.dataset.dragged) {
    e.preventDefault();
    document.getElementById(jump.dataset.scroll)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

main.addEventListener("change", (e) => {
  const el = e.target.closest("[data-change]");
  if (el) changes[el.dataset.change]?.(el);
});

// ---------- Gestes propres à certaines pages ----------
function bind(root) {
  // Recherche d'exercices (sans accents ni majuscules)
  const normalize = (t) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  root.querySelectorAll("[data-search]").forEach((search) => {
    search.addEventListener("input", () => {
      const q = normalize(search.value.trim());
      root.querySelectorAll("[data-name]").forEach((el) => { el.hidden = q !== "" && !normalize(el.dataset.name).includes(q); });
      root.querySelectorAll("[data-group]").forEach((g) => {
        g.hidden = !g.querySelector("[data-name]:not([hidden])");
        if (q && g.tagName === "DETAILS") g.open = true;
      });
    });
  });

  // Nouvelle séance : changer la date recharge la page (séance type du jour, message « passée / à venir »)
  root.querySelectorAll("[data-day-picker]").forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.value) return;
      const p = new URLSearchParams(location.hash.split("?")[1] || "");
      p.set("day", input.value);
      app.go(`#/seance/nouvelle?${p}`);
    });
  });

  // Séance : reps / charge modifiées -> enregistrées tout de suite (sans recharger)
  root.querySelectorAll("[data-set-form]").forEach((form) => {
    form.querySelectorAll("input").forEach((input) => {
      input.addEventListener("change", () => {
        const found = findSet(form.dataset.set);
        const reps = parseInt(form.reps.value, 10), weight = parseKg(form.weight.value, 0);
        if (!found || !(reps >= 1 && reps <= 1000) || !(weight >= 0 && weight <= 1000)) return;
        found.set.reps = reps;
        found.set.weight = weight;
        save();
      });
    });
  });

  // Fiche exercice : animation départ / arrivée, ou une seule position
  root.querySelectorAll("[data-howto]").forEach((fig) => {
    const label = fig.querySelector("[data-step-label]");
    const second = fig.querySelectorAll(".howto-frames img")[1];
    const setLabel = (end) => { label.textContent = end ? "2 · Arrivée" : "1 · Départ"; };
    fig.querySelectorAll("[data-mode-btn]").forEach((btn) => {
      btn.addEventListener("click", () => {
        fig.dataset.mode = btn.dataset.modeBtn;
        fig.querySelectorAll("[data-mode-btn]").forEach((b) => b.classList.toggle("active", b === btn));
        if (btn.dataset.modeBtn !== "anim") setLabel(btn.dataset.modeBtn === "end");
      });
    });
    const timer = setInterval(() => {
      if (!fig.isConnected) return clearInterval(timer);
      if (fig.dataset.mode === "anim") setLabel(parseFloat(getComputedStyle(second).opacity) > 0.5);
    }, 150);
  });

  root.querySelectorAll("[data-weekstrip]").forEach(bindStrip);
}

// Calendrier : appui long sur un jour (0,4 s au doigt, tout de suite à la souris), puis glisser pour déplacer sa séance
function bindStrip(strip) {
  const LONG_PRESS = 400;
  strip.querySelectorAll(".strip-day[data-session]").forEach((cell) => {
    let start = null, timer = null, ghost = null, target = null, dragging = false;
    const reset = () => {
      clearTimeout(timer);
      if (ghost) ghost.remove();
      if (target) target.classList.remove("drop-target");
      cell.classList.remove("dragging", "lifted");
      start = timer = ghost = target = null;
      dragging = false;
    };
    const follow = (x, y) => {
      ghost.style.left = x + "px";
      ghost.style.top = y + "px";
      const over = document.elementFromPoint(x, y);
      const day = over && over.closest(".strip-day");
      const next = day && day !== cell && strip.contains(day) ? day : null;
      if (next !== target) {
        if (target) target.classList.remove("drop-target");
        target = next;
        if (target) target.classList.add("drop-target");
      }
    };
    const beginDrag = (x, y) => {
      dragging = true;
      cell.dataset.dragged = "1";
      cell.classList.remove("lifted");
      cell.classList.add("dragging");
      ghost = cell.cloneNode(true);
      ghost.classList.add("strip-ghost");
      ghost.style.width = cell.offsetWidth + "px";
      document.body.appendChild(ghost);
      follow(x, y);
    };
    cell.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      reset();
      delete cell.dataset.dragged;
      start = { x: e.clientX, y: e.clientY, mouse: e.pointerType === "mouse" };
      try { cell.setPointerCapture(e.pointerId); } catch (_) { /* pointeur déjà relâché */ }
      if (!start.mouse) {
        timer = setTimeout(() => {
          cell.classList.add("lifted");
          if (navigator.vibrate) navigator.vibrate(15);
          beginDrag(start.x, start.y);
        }, LONG_PRESS);
      }
    });
    cell.addEventListener("pointermove", (e) => {
      if (!start) return;
      if (dragging) return follow(e.clientX, e.clientY);
      const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
      if (start.mouse) { if (moved >= 8) beginDrag(e.clientX, e.clientY); }
      else if (moved > 10) reset(); // le doigt a bougé avant la fin de l'appui long : défilement normal
    });
    cell.addEventListener("touchmove", (e) => { if (dragging) e.preventDefault(); }, { passive: false });
    cell.addEventListener("contextmenu", (e) => e.preventDefault());
    cell.addEventListener("pointerup", () => {
      const dest = dragging ? target : null;
      reset();
      if (dest) moveSessionTo(state.sessions.find((s) => s.id === +cell.dataset.session), dest.dataset.date);
      else setTimeout(() => delete cell.dataset.dragged, 0);
    });
    cell.addEventListener("pointercancel", reset);
  });
}

// ---------- Démarrage ----------
async function start() {
  load();
  try {
    await loadBody();
  } catch (_) {
    main.innerHTML = `<div class="flash error">Impossible de charger l'application. Vérifie ta connexion puis recharge la page.</div>`;
    return;
  }
  spriteBox.innerHTML = bodySprite(state.settings.corps);
  document.querySelectorAll("[data-icon]").forEach((el) => { el.innerHTML = String(icon(el.dataset.icon, +el.dataset.size || 22)); });
  window.addEventListener("hashchange", () => render());
  render();
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}
start();
