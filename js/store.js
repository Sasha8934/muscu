// Données de l'utilisateur, enregistrées sur l'appareil (localStorage), comme dans Syrinx.
// Rien n'est envoyé sur Internet. Pour changer d'appareil ou sauvegarder : export / import d'un fichier.

import { EXERCICES_DEPART, PROGRAMME_DEPART } from "./donnees.js";

const CLE = "muscu-donnees";
const VERSION = 1;

export let state = null;

function initial() {
  let id = 1;
  return {
    version: VERSION,
    nextId: 0, // recalculé plus bas
    exercises: EXERCICES_DEPART.map((e) => ({ id: id++, custom: false, ...e })),
    templates: PROGRAMME_DEPART.map((t) => ({ id: id++, ...t })),
    sessions: [],
    bodyweight: [],
    favorites: [],
    settings: { corps: "homme", suggestions: false, objectif: 4 },
  };
}

// Complète des données anciennes ou importées (nouveaux champs, photos ajoutées depuis…)
function normalize(s) {
  s.version = VERSION;
  for (const key of ["exercises", "templates", "sessions", "bodyweight", "favorites"]) s[key] = s[key] || [];
  s.settings = { corps: "homme", suggestions: false, objectif: 4, ...(s.settings || {}) };
  const images = Object.fromEntries(EXERCICES_DEPART.map((e) => [e.name, e.image]));
  for (const e of s.exercises) {
    e.secondary = e.secondary || [];
    if (!e.image && images[e.name]) e.image = images[e.name];
  }
  for (const session of s.sessions) {
    session.items = session.items || [];
    session.muscles = session.muscles || [];
    session.notes = session.notes || "";
    session.done = !!session.done;
  }
  let max = 0;
  const visit = (o) => { if (o && typeof o === "object") { if (Number.isInteger(o.id)) max = Math.max(max, o.id); Object.values(o).forEach(visit); } };
  visit(s);
  s.nextId = Math.max(s.nextId || 0, max + 1);
  return s;
}

export function load() {
  try {
    const text = localStorage.getItem(CLE);
    state = normalize(text ? JSON.parse(text) : initial());
  } catch (_) {
    state = normalize(initial());
  }
  save();
  // Demande au navigateur de ne pas effacer ces données pour faire de la place
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  return state;
}

export function save() {
  localStorage.setItem(CLE, JSON.stringify(state));
}

export const newId = () => state.nextId++;

// ---------- Accès ----------
export const exercise = (id) => state.exercises.find((e) => e.id === +id);
export const session = (id) => state.sessions.find((s) => s.id === +id);
export const template = (id) => state.templates.find((t) => t.id === +id);
export const favorite = (id) => state.favorites.find((f) => f.id === +id);
export function findSet(setId) {
  for (const s of state.sessions) for (const item of s.items) {
    const set = item.sets.find((x) => x.id === +setId);
    if (set) return { session: s, item, set };
  }
  return null;
}

// ---------- Sauvegarde / restauration ----------
export function exportText() {
  return JSON.stringify({ ...state, application: "Muscu", exporteLe: new Date().toISOString() }, null, 1);
}

export function importText(text) {
  const data = JSON.parse(text);
  if (!data || data.application !== "Muscu" || !Array.isArray(data.sessions) || !Array.isArray(data.exercises)) {
    throw new Error("Ce fichier n'est pas une sauvegarde de Muscu.");
  }
  delete data.application;
  delete data.exporteLe;
  state = normalize(data);
  save();
}

export function resetAll() {
  state = normalize(initial());
  save();
}
