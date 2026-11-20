// Guide des exercices : corps cliquable, liste, fiche « comment faire », création / modification.

import { EQUIPMENTS, MUSCLES, MUSCLE_NAMES } from "../donnees.js";
import { state, exercise as getExercise } from "../store.js";
import { enrich, exerciseSummaries, lastMaxWeights, loadSets } from "../calculs.js";
import { byName, charge, html, jourCourt, raw } from "../outils.js";
import { SEXES, bodyMap, bodyMini, equip, icon, thumb } from "../ui.js";

export function vueGuide(params, { sex }) {
  const muscle = MUSCLE_NAMES[params.muscle] ? params.muscle : null;
  const exs = state.exercises.map(enrich).sort(byName);
  const last = lastMaxWeights();
  let groups;
  if (muscle) {
    groups = [
      { name: `${MUSCLE_NAMES[muscle]} : muscle principal`, exercises: exs.filter((e) => e.primary === muscle) },
      { name: "Travaillent aussi ce muscle", exercises: exs.filter((e) => e.secondary.includes(muscle)) },
    ];
  } else {
    groups = MUSCLES.map(([key, name]) => ({ name, exercises: exs.filter((e) => e.primary === key) }));
  }
  groups = groups.filter((g) => g.exercises.length);

  const body = html`
    <div class="row">
      <h1>Guide des exercices</h1>
      <a class="btn small" href="#/exercice/nouveau${muscle ? `?muscle=${muscle}` : ""}">${icon("plus", 18)} Nouveau</a>
    </div>
    <div class="card body-card">
      <div class="body-top">
        <p class="body-hint">${muscle ? html`<strong>${MUSCLE_NAMES[muscle]}</strong> · touche-le à nouveau pour tout revoir` : "Touche un muscle pour voir ses exercices"}</p>
        <div class="segmented" role="group" aria-label="Silhouette">
          ${SEXES.map(([key, label]) => html`<button type="button" data-click="silhouette" data-sexe="${key}" class="${sex === key ? "active" : ""}" aria-pressed="${sex === key ? "true" : "false"}">${label}</button>`)}
        </div>
      </div>
      ${bodyMap(sex, muscle)}
    </div>
    <input class="search" type="search" placeholder="Rechercher un exercice…" data-search>
    <div class="chips">
      <a class="chip ${muscle ? "" : "active"}" href="#/exercices">Tous</a>
      ${MUSCLES.map(([key, name]) => html`<a class="chip ${muscle === key ? "active" : ""}" href="#/exercices?muscle=${key}">${name}</a>`)}
    </div>
    ${groups.map((g) => html`
      <section data-group>
        <h2 class="group-title">${g.name}</h2>
        ${g.exercises.map((e) => html`
          <a class="card guide" href="#/exercice/${e.id}" data-name="${e.name}">
            ${thumb(sex, e)}
            <span class="guide-text"><strong>${e.name}</strong><span class="muted small">${equip(e.equipment)}${e.custom ? " · perso" : ""}</span></span>
            ${last[e.id] ? html`<span class="last-max" title="Plus grosse charge de la dernière séance">${charge(last[e.id].weight, e.bodyweight)}<small>${jourCourt(last[e.id].day)}</small></span>`
              : html`<span class="chev">${icon("right", 18)}</span>`}
          </a>`)}
      </section>`)}
    <p class="muted small center credit">Silhouettes : react-native-body-highlighter (licence MIT, © ELABBASSI Hicham). Photos : Free Exercise DB (domaine public).</p>
    <p class="muted small center">Touche un exercice pour voir comment le faire.<br>En couleur vive : muscle principal (compté dans le tonnage) ; en pâle : muscles secondaires.<br>À droite : ta plus grosse charge lors de la dernière séance.</p>`;
  return { title: "Exercices", nav: "exercices", body };
}

export function vueFiche(params, { sex }) {
  const raw0 = getExercise(params.id);
  if (!raw0) return null;
  const ex = enrich(raw0);
  const last = lastMaxWeights()[ex.id];
  const summary = exerciseSummaries(loadSets({ exerciseId: ex.id }))[0];
  const retour = params.retour ? +params.retour : null;
  const retourSession = retour ? state.sessions.find((s) => s.id === retour) : null;
  const inSession = retourSession && retourSession.items.some((i) => i.exerciseId === ex.id);

  const body = html`
    ${retourSession ? html`<a href="#/seance/${retour}" class="back">${icon("left", 18)}Retour à la séance</a>`
      : html`<a href="#/exercices?muscle=${ex.primary}" class="back">${icon("left", 18)}Exercices</a>`}
    ${ex.image ? html`
      <figure class="howto" data-howto data-mode="anim">
        <div class="howto-frames">
          <img src="img/exos/${ex.image}/0.jpg" alt="${ex.name} : position de départ">
          <img src="img/exos/${ex.image}/1.jpg" alt="${ex.name} : position d'arrivée">
          <span class="howto-step" data-step-label>1 · Départ</span>
        </div>
        <div class="segmented howto-modes" role="group" aria-label="Affichage">
          <button type="button" data-mode-btn="anim" class="active">Animation</button>
          <button type="button" data-mode-btn="start">1 · Départ</button>
          <button type="button" data-mode-btn="end">2 · Arrivée</button>
        </div>
      </figure>` : ""}
    <div class="exo-head big">
      ${bodyMini(sex, ex.primary, ex.secondary)}
      <div><h1>${ex.name}</h1><p class="muted">${equip(ex.equipment)}${ex.custom ? " · perso" : ""}</p></div>
    </div>
    <p class="tags"><span class="tag primary">${ex.primaryName}</span>${ex.secondaryList.map((s) => html`<span class="tag">${s}</span>`)}</p>
    <div class="stat-row card">
      <div><span class="stat-value">${last ? charge(last.weight, ex.bodyweight) : "–"}</span><span class="stat-label">Dernière charge max</span></div>
      <div><span class="stat-value">${summary ? summary.bestText : "–"}</span><span class="stat-label">Meilleure série</span></div>
      <div><span class="stat-value">${summary ? summary.sessionCount : 0}</span><span class="stat-label">Séance${summary && summary.sessionCount > 1 ? "s" : ""}</span></div>
    </div>
    <div class="card">
      <h2>Comment le faire</h2>
      ${ex.image ? html`<p class="muted small">Regarde l'animation : départ (1), puis arrivée (2). Reviens lentement à la position de départ.</p>` : ""}
      ${ex.tips ? html`<p class="tip">${icon("flame", 18)}<span>${ex.tips}</span></p>` : ""}
      ${ex.bodyweight ? html`<p class="muted small">Exercice au poids du corps : tu peux ajouter du lest (ceinture, gilet, haltère).</p>` : ""}
      ${!ex.image && !ex.tips ? html`<p class="muted small">Pas encore d'explication pour cet exercice. Ajoute un conseil avec « Modifier ».</p>` : ""}
    </div>
    ${retourSession && !inSession ? html`<button type="button" class="btn block" data-click="ajouter-exercice" data-session="${retour}" data-exercise="${ex.id}">${icon("plus", 18)} Ajouter à ma séance</button>` : ""}
    <div class="btn-row">
      ${summary ? html`<a class="btn ghost" href="#/progres/exercice/${ex.id}">${icon("chart", 18)} Mes progrès</a>` : ""}
      <a class="btn ghost" href="#/exercice/${ex.id}/modifier">Modifier</a>
    </div>
    ${ex.image ? html`<p class="credit center">Photos : Free Exercise DB (domaine public).</p>` : ""}`;
  return { title: ex.name, nav: "exercices", body };
}

export function vueFormExercice(params) {
  const existing = params.id ? getExercise(params.id) : null;
  if (params.id && !existing) return null;
  const ex = existing || { name: "", primary: MUSCLE_NAMES[params.muscle] ? params.muscle : "", secondary: [], equipment: "Barre", bodyweight: false, tips: "" };
  const retour = params.retour || "";
  const used = existing && state.sessions.some((s) => s.items.some((i) => i.exerciseId === existing.id));
  const back = retour ? `#/seance/${retour}/exercices` : existing ? `#/exercice/${existing.id}` : "#/exercices";

  const body = html`
    <a href="${back}" class="back">${icon("left", 18)}Retour</a>
    <h1>${existing ? "Modifier l'exercice" : "Nouvel exercice"}</h1>
    <form data-action="enregistrer-exercice" data-exercise="${existing ? existing.id : ""}" data-retour="${retour}">
      <label>Nom <input name="name" value="${ex.name}" maxlength="80" required></label>
      <label>Muscle principal
        <select name="primary" required>
          <option value="">Choisir…</option>
          ${MUSCLES.map(([key, name]) => html`<option value="${key}" ${ex.primary === key ? raw("selected") : ""}>${name}</option>`)}
        </select>
      </label>
      <p class="label">Muscles secondaires</p>
      <div class="checks">
        ${MUSCLES.map(([key, name]) => html`<label class="check"><input type="checkbox" name="secondary" value="${key}" ${ex.secondary.includes(key) ? raw("checked") : ""}> ${name}</label>`)}
      </div>
      <label>Matériel
        <select name="equipment">${EQUIPMENTS.map((eq) => html`<option ${ex.equipment === eq ? raw("selected") : ""}>${eq}</option>`)}</select>
      </label>
      <label class="check inline"><input type="checkbox" name="bodyweight" value="1" ${ex.bodyweight ? raw("checked") : ""}> Exercice au poids du corps (on saisit le lest)</label>
      <label>Conseils <textarea name="tips" rows="3" maxlength="500">${ex.tips}</textarea></label>
      <button class="btn block">${existing ? "Enregistrer" : retour ? "Créer et ajouter à la séance" : "Créer l'exercice"}</button>
    </form>
    ${existing ? used ? html`<p class="muted small">Cet exercice est utilisé dans une séance : il ne peut pas être supprimé.</p>`
      : html`<button type="button" class="btn danger block" data-click="supprimer-exercice" data-exercise="${existing.id}" data-confirm="Supprimer cet exercice ?">Supprimer l'exercice</button>` : ""}`;
  return { title: existing ? "Modifier l'exercice" : "Nouvel exercice", nav: "exercices", body };
}
