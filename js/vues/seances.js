// Séances : nouvelle séance, historique, séance (séries prévues / cochées), choix d'un exercice.

import { DAYS, MUSCLES, MUSCLE_NAMES } from "../donnees.js";
import { state, session as getSession, favorite } from "../store.js";
import { enrich, favoritesList, lastMaxWeights, lastPerformance, recordSetId, sessionDetails, sortedTemplates, weekPrefs } from "../calculs.js";
import { addDays, byName, charge, html, iso, jour, jourCourt, kg, kgIn, MOIS, parseDayOr, plural, raw, today, toDate, weekday } from "../outils.js";
import { equip, icon, sessionCard, thumb } from "../ui.js";

const sorted = (list) => [...list].sort((a, b) => (a.day === b.day ? b.id - a.id : a.day < b.day ? 1 : -1));

// ---------- Nouvelle séance ----------
export function vueNouvelle(params) {
  const now = today();
  const day = parseDayOr(params.day);
  const templates = sortedTemplates();
  const favorites = favoritesList();
  let suggested = "";
  if (params.favori && favorite(params.favori)) suggested = `f${params.favori}`;
  else if (weekPrefs().suggestions) {
    const t = templates.find((x) => x.day === DAYS[weekday(day)]);
    if (t) suggested = `t${t.id}`;
  }
  const quick = [[-1, "Hier"], [0, "Aujourd'hui"], [1, "Demain"]].map(([n, label]) => [addDays(now, n), label]);
  const recent = sorted(state.sessions).slice(0, 5);
  const future = day > now, past = day < now;

  const choice = (value, title, sub, pill = "") => html`
    <label class="choice">
      <input type="radio" name="choice" value="${value}" ${suggested === value ? raw("checked") : ""}>
      <span><strong>${title}</strong>${pill ? html` <span class="pill">${pill}</span>` : ""}<br><span class="muted small">${sub}</span></span>
    </label>`;

  const body = html`
    <h1>Nouvelle séance</h1>
    <form data-action="nouvelle-seance">
      <p class="label">Quel jour ?</p>
      <div class="chips wrap">
        ${quick.map(([d, label]) => html`<a class="chip ${iso(d) === iso(day) ? "active" : ""}" href="#/seance/nouvelle?day=${iso(d)}${params.favori ? `&favori=${params.favori}` : ""}">${label}</a>`)}
      </div>
      <label>Ou choisis une date (passée pour saisir, future pour préparer)
        <input type="date" name="day" value="${iso(day)}" required data-day-picker>
      </label>
      ${past ? html`<div class="flash warn">Tu ajoutes une séance passée : <strong>${jour(day)}</strong>.</div>` : ""}
      ${future ? html`<div class="flash">Tu prépares une séance pour <strong>${jour(day).toLowerCase()}</strong>. Tu pourras la déplacer si besoin.</div>` : ""}

      ${favorites.length ? html`
        <p class="label">${icon("star", 14)} Mes séances favorites</p>
        <div class="choices">${favorites.map((f) => choice(`f${f.id}`, f.name, f.exercises.map((x) => `${x.name} ×${x.sets}`).join(" · ")))}</div>` : ""}

      <p class="label">Séance type (groupes musculaires)</p>
      <div class="choices">
        ${templates.map((t) => choice(`t${t.id}`, t.name, t.muscleNames, t.day))}
        ${choice("", "Séance libre", "Tous les exercices")}
      </div>

      <label>Nom (facultatif)
        <input name="name" maxlength="80" placeholder="Par défaut : le nom du favori ou de la séance type">
      </label>
      <button class="btn block">${future ? "Préparer cette séance" : past ? "Saisir cette séance" : "Commencer la séance"}</button>
    </form>

    ${recent.length ? html`
      <div class="row section-head">
        <h2 class="group-title">Dernières séances</h2>
        <a class="small" href="#/seances">Tout voir</a>
      </div>
      ${recent.map((s) => sessionCard(s, sessionDetails(s)))}` : ""}`;
  return { title: "Nouvelle séance", nav: "seance", body };
}

// ---------- Toutes les séances ----------
export function vueHistorique() {
  const months = [];
  for (const s of sorted(state.sessions)) {
    const d = toDate(s.day);
    const label = `${MOIS[d.getMonth()][0].toUpperCase()}${MOIS[d.getMonth()].slice(1)} ${d.getFullYear()}`;
    if (!months.length || months[months.length - 1].label !== label) months.push({ label, sessions: [], tonnage: 0 });
    const details = sessionDetails(s);
    months[months.length - 1].sessions.push({ s, details });
    if (s.done) months[months.length - 1].tonnage += details.tonnage;
  }
  const body = html`
    <a href="#/" class="back">${icon("left", 18)}Semaine</a>
    <div class="row">
      <h1>Toutes mes séances</h1>
      <a class="btn small" href="#/seance/nouvelle">${icon("plus", 18)} Ajouter</a>
    </div>
    <p class="muted small">Touche une séance pour la revoir ou la modifier, même ancienne. Pour saisir une séance passée : « Ajouter », puis choisis la date.</p>
    ${months.length ? months.map((m) => html`
      <div class="row section-head">
        <h2 class="group-title">${m.label}</h2>
        <span class="muted small">${plural(m.sessions.length, "séance")} · ${kg(m.tonnage)} kg</span>
      </div>
      ${m.sessions.map(({ s, details }) => sessionCard(s, details))}`) : html`<p class="muted center empty">Aucune séance pour l'instant.</p>`}`;
  return { title: "Mes séances", nav: "semaine", body };
}

// ---------- Une séance ----------
export function vueSeance(params, { sex }) {
  const s = getSession(params.id);
  if (!s) return null;
  const details = sessionDetails(s);
  const now = today();
  const isFuture = toDate(s.day) > now;
  const fav = s.favoriteId ? favorite(s.favoriteId) : null;
  const needsBw = details.bodyweight === null && details.exercises.some((e) => e.bodyweight);
  const quickDays = [[0, "Aujourd'hui"], [1, "Demain"], [2, "Après-demain"]].map(([n, l]) => [iso(addDays(now, n)), l]);

  const exo = (e) => {
    const last = lastPerformance(e.id, s, e.bodyweight);
    const record = recordSetId(e.id, s, e.doneSets);
    const lastSet = e.sets[e.sets.length - 1];
    const prefill = lastSet ? [lastSet.reps, lastSet.weight] : (last ? last.sets[0] : [10, 0]);
    return html`
    <section class="card exo" id="ex-${e.id}">
      <div class="exo-head">
        <a href="#/exercice/${e.id}?retour=${s.id}" class="thumb-link" aria-label="Comment faire : ${e.name}">${thumb(sex, e)}</a>
        <div class="exo-title">
          <div class="row"><h2>${e.name}</h2><span class="badge">${e.doneSets.length}/${e.sets.length}</span></div>
          ${last ? html`<span class="last-max inline">Dernière fois : ${charge(last.max, e.bodyweight)} max</span>` : ""}
        </div>
      </div>
      <p class="muted small">
        ${equip(e.equipment)} · ${e.muscle}
        ${last ? html`<br>Dernière fois (${jourCourt(last.day)}) : ${last.text}` : ""}
        <br><a href="#/exercice/${e.id}?retour=${s.id}">Comment faire</a>
        ${last ? html` · <a href="#/progres/exercice/${e.id}">Mes progrès</a>` : ""}
      </p>
      ${e.sets.length ? html`
        <div class="set-head"><span>Série</span><span>Reps</span><span>${e.bodyweight ? "Lest" : "Kg"}</span><span>Fait</span><span></span></div>
        <ol class="sets">
          ${e.sets.map((x, i) => html`<li>
            <form data-action="cocher" data-set="${x.id}" class="set-row ${x.done ? "done" : ""}" data-set-form>
              <span class="set-n">${i + 1}</span>
              <input name="reps" type="number" inputmode="numeric" min="1" max="1000" value="${x.reps}" required aria-label="Répétitions de la série ${i + 1}">
              <input name="weight" type="text" inputmode="decimal" value="${kgIn(x.weight)}" placeholder="0" aria-label="${e.bodyweight ? "Lest" : "Charge"} de la série ${i + 1} en kilos">
              <button class="check-btn" aria-pressed="${x.done ? "true" : "false"}" aria-label="${x.done ? "Décocher" : "Cocher"} la série ${i + 1}">${icon("check", 20)}</button>
              <button type="button" class="icon" data-click="supprimer-serie" data-set="${x.id}" aria-label="Supprimer la série ${i + 1}">${icon("x", 16)}</button>
            </form>
            ${x.id === record ? html`<span class="pill record set-record">${icon("trophy", 14)} Record</span>` : ""}
          </li>`)}
        </ol>` : ""}
      <div class="exo-actions">
        <button type="button" class="btn small ghost" data-click="ajouter-serie" data-session="${s.id}" data-exercise="${e.id}">${icon("plus", 16)} Série</button>
        <details class="plan">
          <summary class="btn small ghost">Régler les séries</summary>
          <form data-action="prevoir" data-session="${s.id}" data-exercise="${e.id}" class="plan-form">
            <label>Séries <input name="count" type="number" inputmode="numeric" min="1" max="20" value="${e.sets.length || 3}" required></label>
            <label>Reps <input name="reps" type="number" inputmode="numeric" min="1" max="1000" value="${prefill[0]}" required></label>
            <label>${e.bodyweight ? "Lest" : "Kg"} <input name="weight" type="text" inputmode="decimal" value="${kgIn(prefill[1])}" placeholder="0"></label>
            <button class="btn small">Appliquer</button>
            <p class="muted small">Remplace les séries pas encore cochées. Les séries déjà faites sont gardées.</p>
          </form>
        </details>
      </div>
      <div class="right"><button type="button" class="link danger small" data-click="retirer-exercice" data-session="${s.id}" data-exercise="${e.id}"
        data-confirm="Retirer « ${e.name} » et ses séries de cette séance ?">Retirer l'exercice</button></div>
    </section>`;
  };

  const body = html`
    <a href="#/?semaine=${s.day}" class="back">${icon("left", 18)}Semaine</a>
    <div class="row session-title">
      <h1>${s.name}</h1>
      ${s.done ? html`<span class="status done">${icon("check", 14)} Validée</span>` : html`<span class="status">Prévue</span>`}
    </div>
    <p class="muted session-date">${jour(s.day)}${isFuture ? " · à venir" : ""}</p>
    <div class="stat-row card">
      <div><span class="stat-value">${details.exercises.length}</span><span class="stat-label">Exercice${details.exercises.length > 1 ? "s" : ""}</span></div>
      <div><span class="stat-value">${details.setCount}<small>/${details.setCount + details.plannedCount}</small></span><span class="stat-label">Séries cochées</span></div>
      <div><span class="stat-value">${kg(details.tonnage)}</span><span class="stat-label">kg soulevés</span></div>
    </div>
    ${needsBw ? html`<div class="flash warn">Ajoute ton poids (bouton <a href="#/poids">Poids</a> en haut) pour calculer le tonnage des exercices au poids du corps.</div>` : ""}

    ${details.exercises.length ? details.exercises.map(exo) : html`<p class="muted center empty">Aucun exercice pour l'instant.<br>Ajoute-les dès maintenant pour préparer ta séance.</p>`}

    <a class="btn block ghost dashed" href="#/seance/${s.id}/exercices">${icon("plus", 18)} Ajouter un exercice</a>

    ${s.done
      ? html`<button type="button" class="btn block ghost" data-click="valider" data-session="${s.id}">Annuler la validation</button>`
      : html`<button type="button" class="btn block big" data-click="valider" data-session="${s.id}">${icon("check", 20)} Valider la séance</button>
             <p class="muted small center">Tant que tu ne valides pas, la séance reste « prévue » et ne compte pas dans ta semaine.</p>`}

    <div class="card" id="deplacer">
      <h2>Déplacer la séance</h2>
      <div class="chips wrap">
        ${quickDays.map(([d, label]) => html`<button type="button" class="chip ${d === s.day ? "active" : ""}" data-click="deplacer" data-session="${s.id}" data-day="${d}">${label}</button>`)}
      </div>
      <form data-action="deplacer" data-session="${s.id}" class="move-form">
        <input type="date" name="day" value="${s.day}" required aria-label="Nouvelle date">
        <button class="btn small ghost">Déplacer</button>
      </form>
    </div>

    <div class="card">
      <h2>${icon("star", 18)} Favori</h2>
      ${fav ? html`
        <p class="muted small">Cette séance vient du favori « ${fav.name} ».</p>
        <div class="btn-row">
          <button type="button" class="btn small ghost block-btn" data-click="favori" data-session="${s.id}">Mettre à jour le favori</button>
          <button type="button" class="btn small ghost block-btn" data-click="favori" data-session="${s.id}" data-mode="nouveau">Nouveau favori</button>
        </div>` : html`
        <p class="muted small">Enregistre cette séance (exercices, nombre de séries, reps et poids) pour la relancer en un geste.</p>
        <button type="button" class="btn small ghost" data-click="favori" data-session="${s.id}">${icon("star", 16)} Enregistrer en favori</button>`}
    </div>

    <details class="card">
      <summary>Modifier ou supprimer la séance</summary>
      <form data-action="modifier-seance" data-session="${s.id}">
        <label>Nom <input name="name" value="${s.name}" maxlength="80" required></label>
        <label>Date <input type="date" name="day" value="${s.day}" required></label>
        <label>Notes <textarea name="notes" rows="3" maxlength="1000">${s.notes}</textarea></label>
        <button class="btn">Enregistrer</button>
      </form>
      <button type="button" class="btn danger block" data-click="supprimer-seance" data-session="${s.id}" data-confirm="Supprimer cette séance et toutes ses séries ?">Supprimer la séance</button>
    </details>`;
  return { title: s.name, nav: "seance", body };
}

// ---------- Ajouter un exercice à une séance ----------
export function vueChoixExercice(params, { sex }) {
  const s = getSession(params.id);
  if (!s) return null;
  const used = new Set(s.items.map((i) => i.exerciseId));
  const last = lastMaxWeights();
  const exercises = state.exercises.filter((e) => !used.has(e.id)).map(enrich).sort(byName);
  const suggestedKeys = s.muscles.filter((m) => MUSCLE_NAMES[m]);
  const order = [...suggestedKeys, ...MUSCLES.map(([k]) => k).filter((k) => !suggestedKeys.includes(k))];
  const groups = order.map((key) => ({ key, name: MUSCLE_NAMES[key], suggested: suggestedKeys.includes(key),
    exercises: exercises.filter((e) => e.primary === key) })).filter((g) => g.exercises.length);

  const body = html`
    <a href="#/seance/${s.id}" class="back">${icon("left", 18)}Retour à la séance</a>
    <h1>Ajouter un exercice</h1>
    <input class="search" type="search" placeholder="Rechercher un exercice…" data-search>
    ${groups.map((g) => html`
      <details class="group" data-group ${g.suggested || !suggestedKeys.length ? raw("open") : ""}>
        <summary>${g.name}${g.suggested ? html` <span class="pill">Ta séance</span>` : ""} <span class="muted small">(${g.exercises.length})</span></summary>
        ${g.exercises.map((e) => html`
          <div class="pick-row" data-name="${e.name}">
            <button type="button" class="pick-btn" data-click="ajouter-exercice" data-session="${s.id}" data-exercise="${e.id}">
              ${thumb(sex, e)}
              <span class="guide-text"><strong>${e.name}</strong><span class="muted small">${equip(e.equipment)}</span></span>
              ${last[e.id] ? html`<span class="last-max">${charge(last[e.id].weight, e.bodyweight)}<small>${jourCourt(last[e.id].day)}</small></span>` : ""}
            </button>
            <a class="pick-info" href="#/exercice/${e.id}?retour=${s.id}" aria-label="Comment faire : ${e.name}"><span>?</span></a>
          </div>`)}
      </details>`)}
    <p class="center small"><a href="#/exercice/nouveau?retour=${s.id}">L'exercice n'existe pas ? Crée-le</a></p>`;
  return { title: "Ajouter un exercice", nav: "seance", body };
}
