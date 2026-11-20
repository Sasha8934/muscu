// Progrès : tonnage dans le temps, par muscle, records ; page d'un exercice ; page d'un muscle. Et le poids.

import { MUSCLE_NAMES } from "../donnees.js";
import { state, exercise as getExercise } from "../store.js";
import { PERIODS, bestSetText, enrich, exerciseSummaries, loadSets, oneRm, periodSince, tonnageOverTime } from "../calculs.js";
import { formatSet, html, jour, jourCourt, kg, plural, sum, todayIso } from "../outils.js";
import { bodyMini, chartBlock, equip, icon, periodChips } from "../ui.js";

const subLabel = (chart) => (chart.points[0].label.startsWith("Sem.") ? "par semaine" : "par mois");

export function vueProgres(params) {
  const { key: period, since } = periodSince(params.periode);
  const sets = loadSets({ since });
  const perMuscle = {};
  for (const x of sets) perMuscle[x.primary] = (perMuscle[x.primary] || 0) + x.tonnage;
  const top = Math.max(0, ...Object.values(perMuscle)) || 1;
  const muscles = Object.entries(perMuscle).sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({ key: k, name: MUSCLE_NAMES[k] || k, tonnage: v, pct: Math.round((1000 * v) / top) / 10 }));
  const totals = { sessions: new Set(sets.map((x) => x.sessionId)).size, sets: sets.length, tonnage: sum(sets, (x) => x.tonnage) };
  const chart = sets.length ? { type: "line", zero: true, unit: "kg", points: tonnageOverTime(sets, since) } : null;
  const exercises = exerciseSummaries(loadSets());

  const body = html`
    <h1>Mes progrès</h1>
    ${periodChips(PERIODS, period, "#/progres")}
    <div class="stats">
      <div class="stat"><span class="stat-value">${totals.sessions}</span><span class="stat-label">Séances</span></div>
      <div class="stat"><span class="stat-value">${totals.sets}</span><span class="stat-label">Séries</span></div>
      <div class="stat"><span class="stat-value">${kg(totals.tonnage)}</span><span class="stat-label">kg soulevés</span></div>
    </div>
    ${chart ? html`
      <div class="card">
        <h2>Tonnage</h2>
        <p class="muted small chart-sub">Kilos soulevés ${subLabel(chart)}</p>
        ${chartBlock(chart, "Tonnage")}
      </div>
      <div class="card">
        <h2>Par groupe musculaire</h2>
        <p class="muted small chart-sub">Tonnage compté sur le muscle principal de chaque exercice</p>
        <ul class="hbars">
          ${muscles.map((m) => html`<li><a href="#/progres/muscle/${m.key}?periode=${period}">
            <span class="hbar-label">${m.name}</span>
            <span class="hbar-track"><span class="hbar" style="width: ${m.pct}%"></span></span>
            <span class="hbar-value">${kg(m.tonnage)}</span></a></li>`)}
        </ul>
      </div>` : html`<p class="muted center empty">Aucune série validée sur cette période.<br>Les graphiques apparaîtront dès que tu auras validé tes premières séances.</p>`}
    ${exercises.length ? html`
      <h2 class="group-title">Records par exercice</h2>
      <input class="search" type="search" placeholder="Rechercher un exercice" data-search>
      <div class="card list">
        ${exercises.map((e) => html`
          <a class="list-row" href="#/progres/exercice/${e.id}" data-name="${e.name}">
            <span><strong>${e.name}</strong><br><span class="muted small">${e.muscle} · ${plural(e.sessionCount, "séance")} · ${jourCourt(e.last)}</span></span>
            <span class="list-value">${e.bestText}</span>
          </a>`)}
      </div>` : ""}`;
  return { title: "Progrès", nav: "progres", body };
}

export function vueProgresExercice(params, { sex }) {
  const e0 = getExercise(params.id);
  if (!e0) return null;
  const ex = enrich(e0);
  const isBw = !!ex.bodyweight;
  const bySession = new Map();
  for (const x of loadSets({ exerciseId: ex.id })) {
    if (!bySession.has(x.sessionId)) bySession.set(x.sessionId, { id: x.sessionId, day: x.day, sets: [] });
    bySession.get(x.sessionId).sets.push(x);
  }
  const better = (a, b) => (a.weight > b.weight || (a.weight === b.weight && a.reps > b.reps) ? a : b);
  const history = [...bySession.values()].map((h) => ({
    ...h,
    text: h.sets.map((x) => formatSet(x.reps, x.weight, isBw)).join(" · "),
    max_weight: Math.max(...h.sets.map((x) => x.weight)),
    max_reps: Math.max(...h.sets.map((x) => x.reps)),
    one_rm: Math.max(...h.sets.map((x) => oneRm(x.reps, x.load))),
    tonnage: sum(h.sets, (x) => x.tonnage),
    best: h.sets.reduce(better),
  }));
  const points = (k) => history.map((h) => ({ label: jourCourt(h.day), date: h.day, value: Math.round(h[k] * 10) / 10 }));
  const metrics = isBw ? [["max_reps", "Reps max", "reps"], ["max_weight", "Lest max", "kg"], ["tonnage", "Tonnage", "kg"]]
    : [["max_weight", "Charge max", "kg"], ["one_rm", "1RM estimé", "kg"], ["tonnage", "Tonnage", "kg"]];
  const charts = metrics.map(([k, label, unit]) => ({ key: k, label, type: "line", unit, points: points(k) }));
  const maxBy = (k) => history.reduce((a, b) => (b[k] > a[k] ? b : a));
  let records = null;
  if (history.length) {
    const best = history.reduce((a, b) => (better(b.best, a.best) === b.best && b.best !== a.best ? b : a));
    records = { bestSet: bestSetText(best.best, isBw), bestSetDay: best.day, oneRm: maxBy("one_rm"), maxReps: maxBy("max_reps") };
  }

  const body = html`
    <a href="#/progres" class="back">${icon("left", 18)}Progrès</a>
    <div class="exo-head big">
      ${bodyMini(sex, ex.primary, ex.secondary)}
      <div><h1>${ex.name}</h1><p class="muted">${equip(ex.equipment)} · ${ex.primaryName}${ex.secondaryNames ? ` · aussi : ${ex.secondaryNames}` : ""}${isBw ? " · poids du corps" : ""}</p></div>
    </div>
    ${records ? html`
      <div class="stats two">
        <div class="stat"><span class="stat-value">${records.bestSet}</span><span class="stat-label">Meilleure série · ${jourCourt(records.bestSetDay)}</span></div>
        ${isBw ? html`<div class="stat"><span class="stat-value">${records.maxReps.max_reps} reps</span><span class="stat-label">Plus de reps · ${jourCourt(records.maxReps.day)}</span></div>`
          : html`<div class="stat"><span class="stat-value">${kg(records.oneRm.one_rm)} kg</span><span class="stat-label">1RM estimé · ${jourCourt(records.oneRm.day)}</span></div>`}
      </div>
      ${history.length >= 2 ? html`
        <div class="card">
          <nav class="chips" data-tabs>${charts.map((c, i) => html`<button type="button" class="chip ${i === 0 ? "active" : ""}" data-tab="chart-${c.key}">${c.label}</button>`)}</nav>
          ${charts.map((c, i) => chartBlock(c, `${c.label} de ${ex.name}`, { hidden: i > 0, id: `chart-${c.key}` }))}
          ${!isBw ? html`<p class="muted small">1RM estimé : la charge que tu pourrais soulever une seule fois, calculée à partir de tes séries (formule d'Epley).</p>` : ""}
        </div>` : html`<p class="muted small center">La courbe apparaîtra après ta deuxième séance validée sur cet exercice.</p>`}
      <h2 class="group-title">Historique</h2>
      <div class="card list">
        ${[...history].reverse().map((h) => html`
          <a class="list-row" href="#/seance/${h.id}">
            <span><strong>${jour(h.day)}</strong><br><span class="muted small">${h.text}</span></span>
            <span class="list-value muted small">${kg(h.tonnage)} kg</span>
          </a>`)}
      </div>` : html`<p class="muted center empty">Pas encore de séance validée avec cet exercice.</p>`}`;
  return { title: ex.name, nav: "progres", body };
}

export function vueProgresMuscle(params) {
  const muscle = params.muscle;
  if (!MUSCLE_NAMES[muscle]) return null;
  const { key: period, since } = periodSince(params.periode);
  const sets = loadSets({ since, muscle });
  const chart = sets.length ? { type: "line", zero: true, unit: "kg", points: tonnageOverTime(sets, since) } : null;
  const exercises = new Map();
  for (const x of sets) {
    const e = exercises.get(x.exerciseId) || { id: x.exerciseId, name: x.name, tonnage: 0, sets: 0 };
    e.tonnage += x.tonnage; e.sets += 1;
    exercises.set(x.exerciseId, e);
  }
  const name = MUSCLE_NAMES[muscle];
  const body = html`
    <a href="#/progres?periode=${period}" class="back">${icon("left", 18)}Progrès</a>
    <h1>${name}</h1>
    ${periodChips(PERIODS, period, `#/progres/muscle/${muscle}`)}
    ${chart ? html`
      <div class="card">
        <h2>Tonnage : ${kg(sum(sets, (x) => x.tonnage))} kg</h2>
        <p class="muted small chart-sub">Kilos soulevés ${subLabel(chart)}, exercices dont c'est le muscle principal</p>
        ${chartBlock(chart, `Tonnage ${name}`)}
      </div>
      <h2 class="group-title">Exercices</h2>
      <div class="card list">
        ${[...exercises.values()].sort((a, b) => b.tonnage - a.tonnage).map((e) => html`
          <a class="list-row" href="#/progres/exercice/${e.id}">
            <span><strong>${e.name}</strong><br><span class="muted small">${plural(e.sets, "série")}</span></span>
            <span class="list-value">${kg(e.tonnage)} kg</span>
          </a>`)}
      </div>` : html`<p class="muted center empty">Aucune série validée pour ce muscle sur cette période.</p>`}
    <p class="center"><a href="#/exercices?muscle=${muscle}">Voir les exercices de ce muscle →</a></p>`;
  return { title: name, nav: "progres", body };
}

// ---------- Poids du corps ----------
export function vuePoids() {
  const rows = [...state.bodyweight].sort((a, b) => (a.day === b.day ? b.id - a.id : a.day < b.day ? 1 : -1));
  const entries = rows.map((r, i) => ({ ...r, diff: i + 1 < rows.length ? r.kg - rows[i + 1].kg : null }));
  const chart = rows.length >= 2 ? { type: "line", unit: "kg", points: [...rows].reverse().map((r) => ({ label: jourCourt(r.day), date: r.day, value: r.kg })) } : null;
  const change = entries.length ? entries[0].kg - entries[entries.length - 1].kg : 0;
  const body = html`
    <h1>Mon poids</h1>
    ${entries.length ? html`
      <div class="stats two">
        <div class="stat"><span class="stat-value">${kg(entries[0].kg)} kg</span><span class="stat-label">Actuel</span></div>
        <div class="stat"><span class="stat-value">${change > 0 ? "+" : ""}${kg(change)} kg</span><span class="stat-label">Depuis le ${jourCourt(entries[entries.length - 1].day)}</span></div>
      </div>` : ""}
    ${chart ? html`<div class="card"><h2>Évolution du poids</h2>${chartBlock(chart, "Poids du corps")}</div>` : ""}
    <form data-action="ajouter-poids" class="card weight-form">
      <label>Date <input type="date" name="day" value="${todayIso()}" required></label>
      <label>Poids (kg) <input name="kg" type="text" inputmode="decimal" placeholder="Ex. : 75,4" required></label>
      <button class="btn">Ajouter</button>
    </form>
    <p class="muted small">Ton poids sert à calculer le tonnage des exercices au poids du corps : répétitions × (poids + lest).</p>
    ${entries.length ? html`
      <h2 class="group-title">Historique</h2>
      <ul class="entries card">
        ${entries.map((e) => html`<li>
          <span>${jour(e.day)}</span>
          <span class="entry-kg"><strong>${kg(e.kg)} kg</strong>${e.diff ? html`<span class="small ${e.diff > 0 ? "up" : "down"}">${e.diff > 0 ? "+" : ""}${kg(e.diff)}</span>` : ""}</span>
          <button type="button" class="icon" data-click="supprimer-poids" data-entry="${e.id}" data-confirm="Supprimer cette pesée ?" aria-label="Supprimer">${icon("x", 18)}</button>
        </li>`)}
      </ul>` : ""}`;
  return { title: "Poids", nav: "poids", body };
}
