// Accueil : progression de la semaine, séance du jour, raccourcis, calendrier glissable, jours.

import { COVERS, DAYS } from "../donnees.js";
import { state } from "../store.js";
import { sessionDetails, sortedTemplates, weekPrefs } from "../calculs.js";
import { addDays, court, esc, html, iso, jour, jourCourt, kg, parseDayOr, plural, raw, today, weekStart } from "../outils.js";
import { icon } from "../ui.js";

export function vueSemaine(params) {
  const now = today();
  const start = weekStart(parseDayOr(params.semaine));
  const end = addDays(start, 6);
  const isCurrent = iso(start) === iso(weekStart(now));
  const prefs = weekPrefs();
  const planned = prefs.suggestions ? Object.fromEntries(sortedTemplates().filter((t) => t.day).map((t) => [t.day, t])) : {};
  const rows = state.sessions.filter((s) => s.day >= iso(start) && s.day <= iso(end)).sort((a, b) => (a.day === b.day ? a.id - b.id : a.day < b.day ? -1 : 1));

  const totals = { sessions: rows.filter((s) => s.done).length, sets: 0, tonnage: 0 };
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(start, i);
    const sessions = rows.filter((s) => s.day === iso(d)).map((s) => {
      const details = sessionDetails(s);
      if (s.done) { totals.sets += details.setCount; totals.tonnage += details.tonnage; }
      return { ...s, details };
    });
    days.push({ date: d, isToday: iso(d) === iso(now), isFuture: d > now, sessions, planned: planned[DAYS[i]],
      validated: sessions.some((s) => s.done) });
  }
  const doneDays = days.filter((d) => d.validated).length;
  const goal = prefs.goal;
  const ring = Math.min(100, Math.round((100 * doneDays) / goal));

  // Séance du jour : la suggestion du programme, ou la séance déjà créée aujourd'hui
  const todayInfo = days.find((d) => d.isToday);
  let todayPlan = null;
  if (todayInfo && todayInfo.planned) {
    const t = todayInfo.planned;
    todayPlan = { ...t, cover: COVERS[t.muscles[0]] || "", session: todayInfo.sessions[0] || null };
  } else if (todayInfo && todayInfo.sessions.length) {
    const s = todayInfo.sessions[0], exos = s.details.exercises;
    todayPlan = { name: s.name, muscleNames: [...new Set(exos.map((e) => e.muscle))].join(", "),
      cover: exos.find((e) => e.image)?.image || "", session: s };
  }
  const hour = new Date().getHours();
  const greeting = hour >= 5 && hour < 18 ? "Bonjour" : "Bonsoir";

  const card = (s, d) => html`
    <a class="card session-card ${s.done ? "" : "is-planned"}" href="#/seance/${s.id}">
      <div class="row">
        <strong>${s.name}</strong>
        ${s.done ? html`<span class="status done">${icon("check", 14)} ${kg(s.details.tonnage)} kg</span>` : html`<span class="status">Prévue</span>`}
      </div>
      <div class="muted small">${plural(s.details.exercises.length, "exercice")} · ${s.details.setCount}/${s.details.setCount + s.details.plannedCount} séries cochées</div>
      ${s.details.exercises.length ? html`<div class="mini">${s.details.exercises.map((e) => html`<span>${e.name} <em>${e.doneSets.length}/${e.sets.length}</em></span>`)}</div>` : ""}
      ${!s.done && !d.isFuture && !d.isToday ? html`<p class="small late">Pas encore validée : ouvre-la pour la valider ou la déplacer.</p>` : ""}
    </a>`;

  const dayBlock = (d, i) => html`
    <section class="day ${d.isToday ? "today" : ""}" id="jour-${i + 1}">
      <h2>${jour(d.date)}${d.isToday ? html` <span class="pill">Aujourd'hui</span>` : ""}</h2>
      ${d.sessions.length ? d.sessions.map((s) => card(s, d)) : d.planned ? html`
        <form data-action="nouvelle-seance" class="planned suggestion">
          <input type="hidden" name="choice" value="t${d.planned.id}">
          <input type="hidden" name="day" value="${iso(d.date)}">
          <span><span class="eyebrow">Suggestion du programme</span><br><strong>${d.planned.name}</strong></span>
          <button class="btn small">${d.isToday ? "Commencer" : d.isFuture ? "Préparer" : "Saisir"}</button>
        </form>` : html`
        <div class="rest-row">
          <span class="muted small">Repos</span>
          <a class="small" href="#/seance/nouvelle?day=${iso(d.date)}">${icon("plus", 15)} ${d.isFuture ? "Préparer" : "Ajouter"} une séance</a>
        </div>`}
      ${d.sessions.length ? html`<a class="add-more small" href="#/seance/nouvelle?day=${iso(d.date)}">${icon("plus", 15)} Autre séance ce jour-là</a>` : ""}
    </section>`;

  const strip = html`
    <div class="weekstrip" data-weekstrip>
      ${days.map((d, i) => {
        const movable = d.sessions.find((s) => !s.done) || d.sessions[0];
        const label = d.sessions.length ? d.sessions[0].name : d.planned ? d.planned.name : "";
        const cls = [d.validated ? "done" : "", !d.validated && d.sessions.length ? "plan" : "",
          d.planned && !d.sessions.length ? "suggest" : "", d.isToday ? "today" : "", movable ? "movable" : ""].join(" ");
        return html`<a href="#" data-scroll="jour-${i + 1}" data-date="${iso(d.date)}" ${movable ? raw(`data-session="${movable.id}"`) : ""}
            class="strip-day ${cls}" ${label ? raw(`title="${esc(label)}"`) : ""}>
          <span class="strip-letter">${"LMMJVSD"[i]}</span>
          <span class="strip-num">${d.date.getDate()}</span>
          <span class="strip-label">${label ? court(label) : ""}</span>
        </a>`;
      })}
    </div>
    ${days.some((d) => d.sessions.length) ? html`<p class="strip-hint">${icon("right", 14)} Appui long sur un jour, puis fais-le glisser pour déplacer sa séance.</p>` : ""}`;

  const body = html`
    ${isCurrent ? html`
      <div class="greet">
        <div><p class="muted">${greeting} 👋</p><h1>Prêt à tout donner ?</h1></div>
        <a class="round-btn" href="#/seances" aria-label="Toutes mes séances">${icon("history", 20)}</a>
      </div>` : ""}

    <div class="card progress-card">
      <div class="ring" style="--p: ${ring}" role="img" aria-label="${doneDays} séances validées sur ${goal} prévues">
        <span class="ring-value">${ring}<small>%</small></span>
        <span class="ring-sub">${doneDays}/${goal}</span>
      </div>
      <div class="progress-stats">
        <span class="eyebrow">${isCurrent ? "Progression de la semaine" : `Semaine du ${jourCourt(start)}`}</span>
        <div class="pstat"><span class="pstat-ico">${icon("dumbbell", 18)}</span><span><strong>${kg(totals.tonnage)} kg</strong><small>soulevés</small></span></div>
        <div class="pstat"><span class="pstat-ico">${icon("flame", 18)}</span><span><strong>${plural(totals.sets, "série")}</strong><small>${plural(totals.sessions, "séance")}</small></span></div>
      </div>
    </div>

    ${isCurrent && todayPlan ? html`
      <div class="section-head row"><h2>Séance du jour</h2></div>
      <div class="today-card" ${todayPlan.cover ? raw(`style="--cover: url('${new URL(`img/exos/${todayPlan.cover}/1.jpg`, document.baseURI).href}')"`) : ""}>
        <div class="today-body">
          <h3>${todayPlan.name}</h3>
          <p>${todayPlan.muscleNames}</p>
          ${todayPlan.session && todayPlan.session.done
            ? html`<a class="btn ghost" href="#/seance/${todayPlan.session.id}">${icon("check", 18)} Validée · voir</a>`
            : todayPlan.session
              ? html`<a class="btn" href="#/seance/${todayPlan.session.id}">${icon("right", 18)} Reprendre</a>`
              : html`<form data-action="nouvelle-seance">
                  <input type="hidden" name="choice" value="t${todayPlan.id}">
                  <input type="hidden" name="day" value="${iso(now)}">
                  <button class="btn">${icon("right", 18)} Démarrer</button>
                </form>`}
        </div>
      </div>` : ""}

    ${isCurrent ? html`
      <div class="quick">
        <a href="#/seance/nouvelle"><span>${icon("plus", 20)}</span>Séance</a>
        <a href="#/exercices"><span>${icon("dumbbell", 20)}</span>Exercices</a>
        <a href="#/progres"><span>${icon("chart", 20)}</span>Progrès</a>
        <a href="#/seances"><span>${icon("history", 20)}</span>Historique</a>
      </div>` : ""}

    <div class="weeknav">
      <a class="round-btn" href="#/?semaine=${iso(addDays(start, -7))}" aria-label="Semaine précédente">${icon("left", 20)}</a>
      <div class="weeklabel">
        <span class="eyebrow">${isCurrent ? "Cette semaine" : "Semaine"}</span>
        <strong>${jourCourt(start)} – ${jourCourt(end)}</strong>
      </div>
      <a class="round-btn" href="#/?semaine=${iso(addDays(start, 7))}" aria-label="Semaine suivante">${icon("right", 20)}</a>
    </div>
    ${!isCurrent ? html`
      <div class="week-links">
        <a href="#/" class="chip">Revenir à cette semaine</a>
        <a href="#/seances" class="chip">${icon("history", 15)} Toutes mes séances</a>
      </div>` : ""}

    ${strip}
    ${days.map(dayBlock)}`;

  return { title: "Semaine", nav: "semaine", body };
}
