// Programme : réglages de la semaine, séances types, favoris, sauvegarde des données.

import { DAYS, MUSCLES } from "../donnees.js";
import { state, template as getTemplate } from "../store.js";
import { favoritesList, sortedTemplates, weekPrefs } from "../calculs.js";
import { html, raw } from "../outils.js";
import { icon } from "../ui.js";

export function vueProgramme() {
  const prefs = weekPrefs();
  const templates = sortedTemplates();
  const favorites = favoritesList();
  const count = state.sessions.length;

  const body = html`
    <div class="row">
      <h1>Mon programme</h1>
      <a class="btn small" href="#/programme/nouveau">${icon("plus", 18)} Séance type</a>
    </div>
    <p class="muted small">Chaque séance type regroupe des muscles. À la salle, l'application te propose les exercices de ces muscles.</p>

    <div class="card prefs">
      <h2>Ma semaine</h2>
      <p class="label">Afficher les suggestions du programme dans la semaine ?</p>
      <div class="segmented wide">
        <button type="button" data-click="suggestions" data-value="0" class="${prefs.suggestions ? "" : "active"}" aria-pressed="${prefs.suggestions ? "false" : "true"}">Non</button>
        <button type="button" data-click="suggestions" data-value="1" class="${prefs.suggestions ? "active" : ""}" aria-pressed="${prefs.suggestions ? "true" : "false"}">Oui</button>
      </div>
      <p class="muted small">${prefs.suggestions ? "Les jours choisis ci-dessous apparaissent comme « Suggestion du programme » dans la semaine. Rien n'est compté tant que tu n'as pas validé."
        : "La semaine n'affiche que les séances que tu prépares ou fais toi-même."}</p>
      <div class="prefs-sep"></div>
      <p class="label">Objectif : combien de séances par semaine ?</p>
      <div class="goal-chips">
        ${[1, 2, 3, 4, 5, 6, 7].map((n) => html`<button type="button" data-click="objectif" data-value="${n}" class="chip ${prefs.goal === n ? "active" : ""}" aria-pressed="${prefs.goal === n ? "true" : "false"}">${n}</button>`)}
      </div>
      <p class="muted small">Sert à remplir l'anneau de progression de l'accueil.</p>
    </div>

    <h2 class="group-title">Séances types (groupes musculaires)</h2>
    ${templates.length ? templates.map((t) => html`
      <div class="card tpl-card">
        <a class="tpl-main" href="#/programme/${t.id}"><strong>${t.name}</strong><span class="muted small">${t.muscleNames}</span></a>
        <label class="tpl-day">Jour suggéré
          <select data-change="jour-type" data-template="${t.id}">
            <option value="">Aucun jour</option>
            ${DAYS.map((d) => html`<option ${t.day === d ? raw("selected") : ""}>${d}</option>`)}
          </select>
        </label>
      </div>`) : html`<p class="muted center empty">Aucune séance type. Crée la première !</p>`}

    <h2 class="group-title">${icon("star", 14)} Séances favorites</h2>
    ${favorites.length ? favorites.map((f) => html`
      <div class="card fav-card">
        <div class="row">
          <strong>${f.name}</strong>
          <button type="button" class="icon" data-click="supprimer-favori" data-favorite="${f.id}" data-confirm="Supprimer le favori « ${f.name} » ? Les séances déjà faites sont conservées." aria-label="Supprimer le favori">${icon("x", 16)}</button>
        </div>
        <div class="mini">${f.exercises.map((x) => html`<span>${x.name} <em>×${x.sets}</em></span>`)}</div>
        <a class="btn small fav-go" href="#/seance/nouvelle?favori=${f.id}">${icon("right", 16)} Lancer ou préparer</a>
      </div>`) : html`<p class="muted small">Aucun favori pour l'instant. Dans une séance, appuie sur « Enregistrer en favori » pour la retrouver ici.</p>`}

    <h2 class="group-title">Sauvegarde</h2>
    <div class="card">
      <p class="muted small">Tes données (${count} séance${count > 1 ? "s" : ""}) sont enregistrées <strong>uniquement dans cet appareil</strong>, rien n'est envoyé sur Internet.
        Pense à faire une sauvegarde de temps en temps. Pour passer du téléphone au PC (ou l'inverse) : sauvegarde sur l'un, puis restaure sur l'autre.</p>
      <div class="btn-row">
        <button type="button" class="btn small ghost" data-click="exporter">${icon("save", 16)} Sauvegarder</button>
        <label class="btn small ghost file-btn">${icon("upload", 16)} Restaurer
          <input type="file" accept="application/json,.json" data-change="importer" hidden>
        </label>
      </div>
      <p class="muted small">« Restaurer » remplace toutes les données de cet appareil par celles du fichier.</p>
    </div>`;
  return { title: "Programme", nav: "programme", body };
}

export function vueFormType(params) {
  const existing = params.id ? getTemplate(params.id) : null;
  if (params.id && !existing) return null;
  const t = existing || { name: "", day: "", muscles: [] };
  const body = html`
    <a href="#/programme" class="back">${icon("left", 18)}Programme</a>
    <h1>${existing ? "Modifier la séance type" : "Nouvelle séance type"}</h1>
    <form data-action="enregistrer-type" data-template="${existing ? existing.id : ""}">
      <label>Nom <input name="name" value="${t.name}" maxlength="80" placeholder="Ex. : Dos / Triceps / Abdos" required></label>
      <label>Jour suggéré
        <select name="day">
          <option value="">Aucun jour fixe</option>
          ${DAYS.map((d) => html`<option ${t.day === d ? raw("selected") : ""}>${d}</option>`)}
        </select>
      </label>
      <p class="label">Groupes musculaires travaillés</p>
      <div class="checks">
        ${MUSCLES.map(([key, name]) => html`<label class="check"><input type="checkbox" name="muscles" value="${key}" ${t.muscles.includes(key) ? raw("checked") : ""}> ${name}</label>`)}
      </div>
      <button class="btn block">Enregistrer</button>
    </form>
    ${existing ? html`<button type="button" class="btn danger block" data-click="supprimer-type" data-template="${existing.id}" data-confirm="Supprimer cette séance type ? Les séances déjà faites sont conservées.">Supprimer la séance type</button>` : ""}`;
  return { title: "Séance type", nav: "programme", body };
}
