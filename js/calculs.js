// Calculs : tonnage, dernière performance, records, progrès.
// Règle : seules les séries COCHÉES des séances VALIDÉES comptent dans les stats (semaine, progrès, records, « dernière fois »).

import { DAYS, MUSCLE_NAMES } from "./donnees.js";
import { state, exercise } from "./store.js";
import { MOIS, MOIS_COURTS, addDays, formatSet, iso, jourCourt, kg, parseIso, sum, today, weekStart, sortKey } from "./outils.js";

export const muscleLabel = (keys) => (keys || []).filter((m) => MUSCLE_NAMES[m]).map((m) => MUSCLE_NAMES[m]).join(", ");

// Ordre chronologique des séances (jour, puis ordre de création)
const before = (a, b) => a.day < b.day || (a.day === b.day && a.id < b.id);

export function bodyweightOn(day) {
  const list = [...state.bodyweight].sort((a, b) => (a.day === b.day ? a.id - b.id : a.day < b.day ? -1 : 1));
  const past = list.filter((w) => w.day <= day);
  if (past.length) return past[past.length - 1].kg;
  return list.length ? list[0].kg : null;
}

export const setTonnage = (reps, weight, isBw, bw) => (isBw ? reps * ((bw || 0) + weight) : reps * weight);

export function enrich(e) {
  return {
    ...e,
    primaryName: MUSCLE_NAMES[e.primary] || e.primary,
    secondaryList: e.secondary.filter((m) => MUSCLE_NAMES[m]).map((m) => MUSCLE_NAMES[m]),
    get secondaryNames() { return this.secondaryList.join(", "); },
  };
}

export function sessionDetails(s) {
  const bw = bodyweightOn(s.day);
  let tonnage = 0, setCount = 0, plannedCount = 0;
  const exercises = [];
  for (const item of s.items) {
    const e = exercise(item.exerciseId);
    if (!e) continue;
    const doneSets = item.sets.filter((x) => x.done);
    const t = sum(doneSets, (x) => setTonnage(x.reps, x.weight, e.bodyweight, bw));
    exercises.push({ ...enrich(e), sets: item.sets, doneSets, tonnage: t, muscle: MUSCLE_NAMES[e.primary] || "" });
    tonnage += t;
    setCount += doneSets.length;
    plannedCount += item.sets.length - doneSets.length;
  }
  return { exercises, tonnage, setCount, plannedCount, bodyweight: bw };
}

// Séries cochées d'un exercice dans les séances validées, avant une séance donnée (la plus récente d'abord)
function previousDone(exerciseId, s) {
  return state.sessions
    .filter((o) => o.done && (!s || before(o, s)))
    .sort((a, b) => (before(a, b) ? 1 : -1))
    .map((o) => ({ session: o, sets: (o.items.find((i) => i.exerciseId === exerciseId)?.sets || []).filter((x) => x.done) }))
    .filter((x) => x.sets.length);
}

export function lastPerformance(exerciseId, s, isBw) {
  const prev = previousDone(exerciseId, s)[0];
  if (!prev) return null;
  const sets = prev.sets;
  return {
    day: prev.session.day,
    max: Math.max(...sets.map((x) => x.weight)),
    text: sets.map((x) => formatSet(x.reps, x.weight, isBw)).join(" · "),
    sets: sets.map((x) => [x.reps, x.weight]),
  };
}

const better = (a, b) => a.weight > b.weight || (a.weight === b.weight && a.reps > b.reps);

// La série cochée de cette séance qui bat la meilleure série d'avant (plus lourde, puis plus de reps)
export function recordSetId(exerciseId, s, doneSets) {
  if (!doneSets.length) return null;
  const previous = previousDone(exerciseId, s).flatMap((x) => x.sets);
  if (!previous.length) return null; // première fois : pas encore de record à battre
  const bestBefore = previous.reduce((a, b) => (better(b, a) ? b : a));
  const best = doneSets.reduce((a, b) => (better(b, a) ? b : a));
  return better(best, bestBefore) ? best.id : null;
}

// Pour chaque exercice : la plus grosse charge de la dernière séance validée où il a été fait
export function lastMaxWeights() {
  const out = {};
  const sessions = state.sessions.filter((s) => s.done).sort((a, b) => (before(a, b) ? -1 : 1));
  for (const s of sessions) for (const item of s.items) {
    const done = item.sets.filter((x) => x.done);
    if (done.length) out[item.exerciseId] = { weight: Math.max(...done.map((x) => x.weight)), day: s.day };
  }
  return out;
}

// Séries proposées : celles de la dernière fois (3 par défaut), sinon 3 × 10 répétitions
export function defaultPlan(exerciseId, s, count = 3) {
  const last = lastPerformance(exerciseId, s, false);
  const values = last ? last.sets.slice(0, count) : [];
  while (values.length < count) values.push(values.length ? values[values.length - 1] : [10, 0]);
  return values;
}

export function weekPrefs() {
  const goal = +state.settings.objectif;
  return { suggestions: !!state.settings.suggestions, goal: goal >= 1 && goal <= 7 ? goal : 4 };
}

export function sortedTemplates() {
  return [...state.templates]
    .map((t) => ({ ...t, muscleNames: muscleLabel(t.muscles) }))
    .sort((a, b) => {
      const da = DAYS.includes(a.day) ? DAYS.indexOf(a.day) : 99, db = DAYS.includes(b.day) ? DAYS.indexOf(b.day) : 99;
      return da - db || sortKey(a.name).localeCompare(sortKey(b.name));
    });
}

export function favoritesList() {
  return [...state.favorites]
    .sort((a, b) => sortKey(a.name).localeCompare(sortKey(b.name)))
    .map((f) => ({
      ...f,
      muscleNames: muscleLabel(f.muscles),
      exercises: f.items.map((i) => ({ name: exercise(i.exerciseId)?.name || "?", sets: i.sets.length })),
    }));
}

// ---------- Progrès ----------
export const PERIODS = [["1m", "1 mois", 30], ["3m", "3 mois", 91], ["6m", "6 mois", 182], ["1a", "1 an", 365], ["tout", "Tout", null]];

export function periodSince(key) {
  const p = PERIODS.find((x) => x[0] === key) || PERIODS[1];
  return { key: p[0], since: p[2] ? addDays(today(), -(p[2] - 1)) : null };
}

export const oneRm = (reps, load) => (reps <= 1 ? load : load * (1 + reps / 30));

// Toutes les séries comptées (cochées, séances validées), avec la charge réelle et le tonnage
export function loadSets({ since = null, exerciseId = null, muscle = null } = {}) {
  const out = [];
  const sessions = state.sessions.filter((s) => s.done && (!since || s.day >= iso(since)))
    .sort((a, b) => (before(a, b) ? -1 : 1));
  for (const s of sessions) {
    const bw = bodyweightOn(s.day);
    for (const item of s.items) {
      const e = exercise(item.exerciseId);
      if (!e || (exerciseId && e.id !== exerciseId) || (muscle && e.primary !== muscle)) continue;
      for (const x of item.sets) {
        if (!x.done) continue;
        const load = e.bodyweight ? (bw || 0) + x.weight : x.weight;
        out.push({ ...x, sessionId: s.id, day: s.day, exerciseId: e.id, name: e.name, primary: e.primary,
          bodyweight: e.bodyweight, load, tonnage: x.reps * load });
      }
    }
  }
  return out;
}

// Tonnage par semaine (ou par mois si la période est longue), semaines vides comprises
export function tonnageOverTime(sets, since) {
  const first = since || (sets.length ? parseIso(sets[0].day) : today());
  const start = weekStart(first);
  const weeks = Math.round((weekStart(today()) - start) / (7 * 864e5)) + 1;
  if (weeks <= 26) {
    const buckets = new Map();
    for (let i = 0; i < weeks; i++) buckets.set(iso(addDays(start, 7 * i)), 0);
    for (const x of sets) {
      const k = iso(weekStart(parseIso(x.day)));
      if (buckets.has(k)) buckets.set(k, buckets.get(k) + x.tonnage);
    }
    return [...buckets].map(([d, v]) => ({ label: `Sem. du ${jourCourt(d)}`, short: jourCourt(d), date: d, value: Math.round(v * 10) / 10 }));
  }
  const buckets = new Map();
  let d = new Date(first.getFullYear(), first.getMonth(), 1);
  while (d <= today()) { buckets.set(iso(d), 0); d = new Date(d.getFullYear(), d.getMonth() + 1, 1); }
  for (const x of sets) {
    const p = parseIso(x.day), k = iso(new Date(p.getFullYear(), p.getMonth(), 1));
    if (buckets.has(k)) buckets.set(k, buckets.get(k) + x.tonnage);
  }
  return [...buckets].map(([k, v]) => {
    const m = parseIso(k);
    const name = MOIS[m.getMonth()];
    return { label: `${name[0].toUpperCase()}${name.slice(1)} ${m.getFullYear()}`, short: MOIS_COURTS[m.getMonth()], date: k, value: Math.round(v * 10) / 10 };
  });
}

export function bestSetText(x, isBw) {
  if (isBw) return `${x.reps} reps` + (x.weight ? ` + ${kg(x.weight)} kg` : "");
  return `${x.reps} × ${kg(x.weight)} kg`;
}

// Pour chaque exercice pratiqué : meilleure série, dernière fois, nombre de séances
export function exerciseSummaries(sets) {
  const byEx = new Map();
  for (const x of sets) {
    let e = byEx.get(x.exerciseId);
    if (!e) {
      e = { id: x.exerciseId, name: x.name, bodyweight: x.bodyweight, muscle: MUSCLE_NAMES[x.primary] || "", best: x, last: x.day, sessions: new Set() };
      byEx.set(x.exerciseId, e);
    }
    if (better(x, e.best)) e.best = x;
    if (x.day > e.last) e.last = x.day;
    e.sessions.add(x.sessionId);
  }
  return [...byEx.values()]
    .map((e) => ({ ...e, bestText: bestSetText(e.best, e.bodyweight), sessionCount: e.sessions.size }))
    .sort((a, b) => (a.last < b.last ? 1 : a.last > b.last ? -1 : 0));
}
