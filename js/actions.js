// Ce que fait chaque formulaire (data-action) et chaque bouton (data-click / data-change).
// Chaque action modifie les données, les enregistre, puis affiche la bonne page.

import { DAYS, EQUIPMENTS, MUSCLE_NAMES } from "./donnees.js";
import * as store from "./store.js";
import { state, save, newId } from "./store.js"; // liaisons « vivantes » : suivent une restauration
import { defaultPlan } from "./calculs.js";
import { iso, jour, parseIso, parseKg, today } from "./outils.js";

let app = null; // { go(hash), rerender(), flash(message, kind) }
export const setApp = (a) => { app = a; };

const getSession = (id) => store.session(id);

// Répétitions et charge d'un formulaire ; null si ce n'est pas valable
function readSet(fd) {
  const reps = parseInt(fd.get("reps"), 10);
  const weight = parseKg(fd.get("weight"), 0);
  if (!(reps >= 1 && reps <= 1000) || !(weight >= 0 && weight <= 1000)) return null;
  return { reps, weight };
}

const plannedSets = (plan) => plan.map(([reps, weight]) => ({ id: newId(), reps, weight, done: false }));

// Ajoute l'exercice à la séance avec ses séries prévues (par défaut : 3 séries, valeurs de la dernière fois)
export function addToSession(s, exerciseId, plan = null) {
  if (s.items.some((i) => i.exerciseId === exerciseId)) return;
  s.items.push({ exerciseId, sets: plannedSets(plan || defaultPlan(exerciseId, s)) });
}

function createSession(day, choice, name) {
  let source = null, fav = null;
  if (/^t\d+$/.test(choice)) source = store.template(choice.slice(1));
  if (/^f\d+$/.test(choice)) source = fav = store.favorite(choice.slice(1));
  const s = { id: newId(), day: iso(day), name: (name || (source ? source.name : "Séance libre")).slice(0, 80),
    muscles: source ? [...source.muscles] : [], notes: "", done: false, favoriteId: fav ? fav.id : null, items: [] };
  state.sessions.push(s);
  if (fav) for (const item of fav.items) addToSession(s, item.exerciseId, item.sets.map((x) => [x.reps, x.weight]));
  return s;
}

// ---------- Formulaires ----------
export const forms = {
  "nouvelle-seance"(fd) {
    const s = createSession(parseIso(fd.get("day")) || today(), fd.get("choice") || "", (fd.get("name") || "").trim());
    save();
    app.go(`#/seance/${s.id}`);
  },

  cocher(fd, el) {
    const found = store.findSet(el.dataset.set);
    if (!found) return;
    if (found.set.done) {
      found.set.done = false;
    } else {
      const v = readSet(fd);
      if (!v) return app.flash("Vérifie le nombre de répétitions et la charge.", "error");
      Object.assign(found.set, v, { done: true });
    }
    save();
    app.rerender();
  },

  prevoir(fd, el) {
    const s = getSession(el.dataset.session);
    const item = s && s.items.find((i) => i.exerciseId === +el.dataset.exercise);
    const count = parseInt(fd.get("count"), 10);
    const v = readSet(fd);
    if (!item || !v || !(count >= 1 && count <= 20)) return app.flash("Vérifie le nombre de séries, de répétitions et la charge.", "error");
    const done = item.sets.filter((x) => x.done);
    item.sets = [...done, ...plannedSets(Array(Math.max(count - done.length, 0)).fill([v.reps, v.weight]))];
    save();
    app.rerender();
  },

  deplacer(fd, el) {
    moveSession(getSession(el.dataset.session), fd.get("day"));
  },

  "modifier-seance"(fd, el) {
    const s = getSession(el.dataset.session);
    s.name = (fd.get("name") || "").trim().slice(0, 80) || "Séance";
    s.day = iso(parseIso(fd.get("day")) || parseIso(s.day));
    s.notes = (fd.get("notes") || "").trim().slice(0, 1000);
    save();
    app.flash("Séance enregistrée.");
    app.rerender();
  },

  "enregistrer-exercice"(fd, el) {
    const name = (fd.get("name") || "").trim().slice(0, 80);
    const primary = fd.get("primary");
    if (!name || !MUSCLE_NAMES[primary]) return app.flash("Indique au moins un nom et un muscle principal.", "error");
    const id = el.dataset.exercise ? +el.dataset.exercise : null;
    if (state.exercises.some((e) => e.id !== id && e.name.toLowerCase() === name.toLowerCase())) return app.flash("Un exercice porte déjà ce nom.", "error");
    const values = {
      name, primary,
      secondary: fd.getAll("secondary").filter((m) => MUSCLE_NAMES[m] && m !== primary),
      equipment: EQUIPMENTS.includes(fd.get("equipment")) ? fd.get("equipment") : "Autre",
      bodyweight: fd.get("bodyweight") === "1",
      tips: (fd.get("tips") || "").trim().slice(0, 500),
    };
    let ex = id ? store.exercise(id) : null;
    if (ex) Object.assign(ex, values);
    else { ex = { id: newId(), custom: true, image: "", ...values }; state.exercises.push(ex); }
    const retour = el.dataset.retour ? getSession(el.dataset.retour) : null;
    if (retour) addToSession(retour, ex.id);
    save();
    if (retour) return app.go(`#/seance/${retour.id}?ex=${ex.id}`);
    app.flash("Exercice enregistré.");
    app.go(`#/exercice/${ex.id}`);
  },

  "enregistrer-type"(fd, el) {
    const name = (fd.get("name") || "").trim().slice(0, 80);
    const muscles = fd.getAll("muscles").filter((m) => MUSCLE_NAMES[m]);
    if (!name || !muscles.length) return app.flash("Indique un nom et au moins un groupe musculaire.", "error");
    const day = DAYS.includes(fd.get("day")) ? fd.get("day") : "";
    const t = el.dataset.template ? store.template(el.dataset.template) : null;
    if (t) Object.assign(t, { name, day, muscles });
    else state.templates.push({ id: newId(), name, day, muscles });
    save();
    app.flash("Programme enregistré.");
    app.go("#/programme");
  },

  "ajouter-poids"(fd) {
    const value = parseKg(fd.get("kg"));
    if (!(value >= 20 && value <= 400)) return app.flash("Indique un poids valide, en kilos.", "error");
    state.bodyweight.push({ id: newId(), day: iso(parseIso(fd.get("day")) || today()), kg: value });
    save();
    app.flash("Poids enregistré.");
    app.rerender();
  },
};

function moveSession(s, dayText) {
  const d = parseIso(dayText);
  if (!s || !d) return;
  s.day = iso(d);
  save();
  app.flash(`Séance déplacée au ${jour(d).toLowerCase()}.`);
  app.rerender();
}
export const moveSessionTo = moveSession;

// ---------- Boutons ----------
export const clicks = {
  "supprimer-serie"(el) {
    const found = store.findSet(el.dataset.set);
    if (!found) return;
    found.item.sets = found.item.sets.filter((x) => x !== found.set);
    save();
    app.rerender();
  },

  "ajouter-serie"(el) {
    const s = getSession(el.dataset.session);
    const item = s && s.items.find((i) => i.exerciseId === +el.dataset.exercise);
    if (!item) return;
    const last = item.sets[item.sets.length - 1];
    item.sets.push(...plannedSets(last ? [[last.reps, last.weight]] : defaultPlan(item.exerciseId, s, 1)));
    save();
    app.rerender();
  },

  "retirer-exercice"(el) {
    const s = getSession(el.dataset.session);
    s.items = s.items.filter((i) => i.exerciseId !== +el.dataset.exercise);
    save();
    app.rerender();
  },

  valider(el) {
    const s = getSession(el.dataset.session);
    if (s.done) {
      s.done = false;
      app.flash("La séance est de nouveau « prévue ».");
    } else {
      s.done = true;
      const left = s.items.reduce((n, i) => n + i.sets.filter((x) => !x.done).length, 0);
      app.flash("Séance validée, bravo !" + (left ? ` ${left} série${left > 1 ? "s" : ""} non cochée${left > 1 ? "s ne comptent" : " ne compte"} pas.` : ""));
    }
    save();
    app.rerender();
  },

  deplacer(el) { moveSession(getSession(el.dataset.session), el.dataset.day); },

  favori(el) {
    const s = getSession(el.dataset.session);
    if (!s.items.length) return app.flash("Ajoute au moins un exercice avant d'enregistrer la séance en favori.", "error");
    const items = s.items.map((i) => ({ exerciseId: i.exerciseId, sets: i.sets.map((x) => ({ reps: x.reps, weight: x.weight })) }));
    let fav = s.favoriteId ? store.favorite(s.favoriteId) : null;
    if (fav && el.dataset.mode !== "nouveau") {
      Object.assign(fav, { name: s.name, muscles: [...s.muscles], items });
      app.flash("Favori mis à jour.");
    } else {
      fav = { id: newId(), name: s.name, muscles: [...s.muscles], items };
      state.favorites.push(fav);
      s.favoriteId = fav.id;
      app.flash("Séance ajoutée à tes favoris.");
    }
    save();
    app.rerender();
  },

  "supprimer-seance"(el) {
    const s = getSession(el.dataset.session);
    state.sessions.splice(state.sessions.indexOf(s), 1);
    save();
    app.flash("Séance supprimée.");
    app.go(`#/?semaine=${s.day}`);
  },

  "ajouter-exercice"(el) {
    const s = getSession(el.dataset.session);
    const exerciseId = +el.dataset.exercise;
    if (!s || !store.exercise(exerciseId)) return;
    addToSession(s, exerciseId);
    save();
    app.go(`#/seance/${s.id}?ex=${exerciseId}`);
  },

  silhouette(el) {
    state.settings.corps = el.dataset.sexe === "femme" ? "femme" : "homme";
    save();
    app.rerender({ body: true });
  },

  "supprimer-exercice"(el) {
    const id = +el.dataset.exercise;
    if (state.sessions.some((s) => s.items.some((i) => i.exerciseId === id))) return app.flash("Cet exercice est utilisé dans une séance : il ne peut pas être supprimé.", "error");
    state.exercises = state.exercises.filter((e) => e.id !== id);
    for (const f of state.favorites) f.items = f.items.filter((i) => i.exerciseId !== id);
    save();
    app.flash("Exercice supprimé.");
    app.go("#/exercices");
  },

  suggestions(el) { state.settings.suggestions = el.dataset.value === "1"; save(); app.rerender(); },
  objectif(el) { state.settings.objectif = +el.dataset.value; save(); app.rerender(); },

  "supprimer-favori"(el) {
    const id = +el.dataset.favorite;
    for (const s of state.sessions) if (s.favoriteId === id) s.favoriteId = null;
    state.favorites = state.favorites.filter((f) => f.id !== id);
    save();
    app.flash("Favori supprimé.");
    app.rerender();
  },

  "supprimer-type"(el) {
    state.templates = state.templates.filter((t) => t.id !== +el.dataset.template);
    save();
    app.flash("Séance type supprimée.");
    app.go("#/programme");
  },

  "supprimer-poids"(el) {
    state.bodyweight = state.bodyweight.filter((w) => w.id !== +el.dataset.entry);
    save();
    app.flash("Pesée supprimée.");
    app.rerender();
  },

  exporter() {
    const blob = new Blob([store.exportText()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `muscu-sauvegarde-${iso(today())}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    app.flash("Sauvegarde créée : retrouve le fichier dans tes téléchargements.");
    app.rerender();
  },
};

// ---------- Listes déroulantes et fichiers ----------
export const changes = {
  "jour-type"(el) {
    const t = store.template(el.dataset.template);
    if (!t) return;
    t.day = DAYS.includes(el.value) ? el.value : "";
    save();
    app.rerender();
  },

  async importer(el) {
    const file = el.files && el.files[0];
    if (!file) return;
    if (!confirm("Remplacer toutes les données de cet appareil par celles de ce fichier ?")) { el.value = ""; return; }
    try {
      store.importText(await file.text());
      app.flash("Données restaurées.");
      app.rerender({ body: true });
    } catch (err) {
      app.flash(err.message || "Fichier illisible.", "error");
      app.rerender();
    }
  },
};
