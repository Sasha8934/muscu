// Demande une confirmation avant les suppressions
document.querySelectorAll("form[data-confirm]").forEach((form) => {
  form.addEventListener("submit", (event) => {
    if (!confirm(form.dataset.confirm)) event.preventDefault();
  });
});

// Recherche d'exercices (sans tenir compte des accents ni des majuscules)
const normalize = (text) => text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const search = document.querySelector("[data-search]");
if (search) {
  search.addEventListener("input", () => {
    const query = normalize(search.value.trim());
    document.querySelectorAll("[data-name]").forEach((el) => {
      el.hidden = query !== "" && !normalize(el.dataset.name).includes(query);
    });
    document.querySelectorAll("[data-group]").forEach((group) => {
      group.hidden = !group.querySelector("[data-name]:not([hidden])");
      if (query && group.tagName === "DETAILS") group.open = true;
    });
  });
}

// Boutons − / + autour des champs répétitions et charge
document.querySelectorAll(".stepper [data-step]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = btn.parentElement.querySelector("input");
    const step = parseFloat(btn.dataset.step);
    const current = parseFloat((input.value || "0").replace(",", ".")) || 0;
    const min = input.name === "reps" ? 1 : 0;
    const next = Math.max(min, Math.round((current + step) * 100) / 100);
    input.value = String(next).replace(".", ",");
    if (navigator.vibrate) navigator.vibrate(8);
  });
});

// Nouvelle séance : changer la date recharge la page (séance type du jour, message « séance passée »)
const dayPicker = document.querySelector("[data-day-picker]");
if (dayPicker) {
  dayPicker.addEventListener("change", () => {
    if (dayPicker.value) window.location.search = "?day=" + dayPicker.value;
  });
}

// Fiche exercice : animation départ / arrivée, ou une seule position
document.querySelectorAll("[data-howto]").forEach((fig) => {
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
  // Pendant l'animation, l'étiquette suit l'image affichée
  setInterval(() => {
    if (fig.dataset.mode === "anim") setLabel(parseFloat(getComputedStyle(second).opacity) > 0.5);
  }, 150);
});

// Séance : enregistre tout de suite les reps / la charge modifiées d'une série (sans recharger la page)
document.querySelectorAll("[data-set-form]").forEach((form) => {
  form.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", async () => {
      if (!form.checkValidity()) return;
      form.classList.add("saving");
      try {
        await fetch(form.dataset.update, {
          method: "POST",
          body: new FormData(form),
          headers: { "X-Muscu-Fetch": "1" },
        });
      } finally {
        form.classList.remove("saving");
      }
    });
  });
});

// Listes déroulantes qui s'enregistrent dès qu'on change la valeur (ex. : jour d'une séance type)
document.querySelectorAll("select[data-autosubmit]").forEach((select) => {
  select.addEventListener("change", () => select.form.submit());
});

// Calendrier de la semaine : appui long sur un jour, puis glisser sur un autre pour déplacer sa séance.
// Au doigt, le glisser ne démarre qu'après un appui long (la page défile normalement sinon) ; à la souris, tout de suite.
document.querySelectorAll("[data-weekstrip]").forEach((strip) => {
  const LONG_PRESS = 400;  // millisecondes
  const moveUrl = (id) => strip.dataset.moveUrl.replace("/0/", `/${id}/`);

  strip.querySelectorAll(".strip-day[data-session]").forEach((cell) => {
    let start = null, timer = null, ghost = null, target = null, dragging = false, justDragged = false;

    const reset = () => {
      clearTimeout(timer);
      if (ghost) ghost.remove();
      if (target) target.classList.remove("drop-target");
      cell.classList.remove("dragging", "lifted");
      start = timer = ghost = target = null;
      dragging = false;
    };

    const beginDrag = (x, y) => {
      dragging = true;
      justDragged = true;
      cell.classList.remove("lifted");
      cell.classList.add("dragging");
      ghost = cell.cloneNode(true);
      ghost.classList.add("strip-ghost");
      ghost.style.width = cell.offsetWidth + "px";
      document.body.appendChild(ghost);
      follow(x, y);
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

    cell.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      reset();
      start = { x: e.clientX, y: e.clientY, mouse: e.pointerType === "mouse" };
      justDragged = false;
      try { cell.setPointerCapture(e.pointerId); } catch (_) { /* pointeur déjà relâché */ }
      if (!start.mouse) {
        timer = setTimeout(() => {
          // Appui long réussi : la case « se soulève », on peut la faire glisser
          cell.classList.add("lifted");
          if (navigator.vibrate) navigator.vibrate(15);
          beginDrag(start.x, start.y);
        }, LONG_PRESS);
      }
    });

    cell.addEventListener("pointermove", (e) => {
      if (!start) return;
      if (dragging) { follow(e.clientX, e.clientY); return; }
      const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
      if (start.mouse) {
        if (moved >= 8) beginDrag(e.clientX, e.clientY);
      } else if (moved > 10) {
        reset();  // le doigt a bougé avant la fin de l'appui long : c'est un défilement normal
      }
    });

    // Pendant le glisser, empêcher la page de défiler
    cell.addEventListener("touchmove", (e) => { if (dragging) e.preventDefault(); }, { passive: false });
    // Pas de menu « ouvrir le lien » sur un appui long
    cell.addEventListener("contextmenu", (e) => e.preventDefault());

    cell.addEventListener("pointerup", async () => {
      const dest = dragging ? target : null;
      reset();
      if (!dest) return;
      const body = new FormData();
      body.append("day", dest.dataset.date);
      const response = await fetch(moveUrl(cell.dataset.session), {
        method: "POST", body, headers: { "X-Muscu-Fetch": "1" },
      });
      if (response.ok) window.location.reload();
    });

    cell.addEventListener("pointercancel", reset);
    // Après un glisser, ne pas suivre le lien du jour
    cell.addEventListener("click", (e) => { if (justDragged) { e.preventDefault(); justDragged = false; } });
  });
});
