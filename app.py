"""
Muscu - application de suivi de musculation.

Lancer :  python app.py
Puis ouvrir http://127.0.0.1:5000 dans le navigateur.

En ligne (voir MISE_EN_LIGNE.md), deux variables d'environnement :
  MUSCU_PASSWORD    mot de passe demandé pour entrer (sans elle : pas de mot de passe, usage sur le PC)
  MUSCU_SECRET_KEY  (facultatif) clé qui protège la connexion ; sinon créée au hasard dans .muscu_secret_key
"""
import hmac
import os
import secrets
import sqlite3
import time
import unicodedata
from datetime import date, datetime, timedelta
from pathlib import Path

from flask import Flask, abort, flash, g, redirect, render_template, request, session, url_for

import body
from data import DAYS, EQUIPMENTS, EXERCISES, MUSCLE_NAMES, MUSCLES, TEMPLATES
from illustrations import COVERS, IMAGES

BASE_DIR = Path(__file__).parent
DB_PATH = Path(os.environ.get("MUSCU_DB", BASE_DIR / "muscu.db"))

app = Flask(__name__)
PASSWORD = os.environ.get("MUSCU_PASSWORD", "")


def secret_key():
    """Clé qui protège la connexion. En ligne, si elle n'est pas fournie, elle est créée une fois
    au hasard et gardée à côté de la base (fichier jamais envoyé sur GitHub)."""
    if os.environ.get("MUSCU_SECRET_KEY"):
        return os.environ["MUSCU_SECRET_KEY"]
    if not PASSWORD:
        return "dev-local-seulement"
    path = DB_PATH.parent / ".muscu_secret_key"
    if not path.exists():
        path.write_text(secrets.token_hex(32), encoding="utf-8")
    return path.read_text(encoding="utf-8").strip()


app.config["SECRET_KEY"] = secret_key()
if PASSWORD:
    # En ligne : connexion gardée un an sur l'appareil, cookie envoyé seulement en HTTPS
    app.config.update(PERMANENT_SESSION_LIFETIME=timedelta(days=365), SESSION_COOKIE_SECURE=True,
                      SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE="Lax")

MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet",
        "août", "septembre", "octobre", "novembre", "décembre"]
MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.",
               "août", "sept.", "oct.", "nov.", "déc."]

SCHEMA = """
CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    primary_muscle TEXT NOT NULL,
    secondary TEXT NOT NULL DEFAULT '',
    equipment TEXT NOT NULL DEFAULT '',
    bodyweight INTEGER NOT NULL DEFAULT 0,
    tips TEXT NOT NULL DEFAULT '',
    custom INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    day TEXT NOT NULL DEFAULT '',
    muscles TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY,
    day TEXT NOT NULL,
    name TEXT NOT NULL,
    muscles TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS session_exercises (
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id),
    position INTEGER NOT NULL,
    PRIMARY KEY (session_id, exercise_id)
);
CREATE TABLE IF NOT EXISTS sets (
    id INTEGER PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id),
    reps INTEGER NOT NULL,
    weight REAL NOT NULL DEFAULT 0,  -- charge, ou lest pour un exercice au poids du corps
    created TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    muscles TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS favorite_sets (
    id INTEGER PRIMARY KEY,
    favorite_id INTEGER NOT NULL REFERENCES favorites(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id),
    position INTEGER NOT NULL,
    reps INTEGER NOT NULL,
    weight REAL NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS bodyweight (
    id INTEGER PRIMARY KEY,
    day TEXT NOT NULL,
    kg REAL NOT NULL
);
"""


# ---------- Base de données ----------
def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


@app.teardown_appcontext
def close_db(_exc):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    db = sqlite3.connect(DB_PATH)
    db.executescript(SCHEMA)
    if db.execute("SELECT COUNT(*) FROM exercises").fetchone()[0] == 0:
        db.executemany(
            "INSERT INTO exercises (name, primary_muscle, secondary, equipment, bodyweight, tips) VALUES (?, ?, ?, ?, ?, ?)",
            [(n, p, ",".join(s), e, int(bw), t) for n, p, s, e, bw, t in EXERCISES],
        )
    if db.execute("SELECT COUNT(*) FROM templates").fetchone()[0] == 0:
        db.executemany(
            "INSERT INTO templates (name, day, muscles) VALUES (?, ?, ?)",
            [(n, d, ",".join(m)) for n, d, m in TEMPLATES],
        )
    # Photos « comment faire » : colonne ajoutée sans toucher aux données existantes
    columns = {r[1] for r in db.execute("PRAGMA table_info(exercises)")}
    if "image" not in columns:
        db.execute("ALTER TABLE exercises ADD COLUMN image TEXT NOT NULL DEFAULT ''")
    # Séries cochées et séances validées : rien n'est considéré comme fait tant que l'utilisateur ne l'a pas validé
    if "done" not in {r[1] for r in db.execute("PRAGMA table_info(sets)")}:
        db.execute("ALTER TABLE sets ADD COLUMN done INTEGER NOT NULL DEFAULT 0")
    session_columns = {r[1] for r in db.execute("PRAGMA table_info(sessions)")}
    if "done" not in session_columns:
        db.execute("ALTER TABLE sessions ADD COLUMN done INTEGER NOT NULL DEFAULT 0")
    if "favorite_id" not in session_columns:
        db.execute("ALTER TABLE sessions ADD COLUMN favorite_id INTEGER")
    # Une seule fois : les séances marquées « validées » par l'ancienne mise à jour redeviennent « prévues »
    # (demande de l'utilisateur : c'est à lui de les valider). Les séries cochées ne sont pas touchées.
    if not db.execute("SELECT 1 FROM settings WHERE key = 'validation_remise_a_zero'").fetchone():
        db.execute("UPDATE sessions SET done = 0")
        db.execute("INSERT INTO settings (key, value) VALUES ('validation_remise_a_zero', '1')")
    db.executemany("UPDATE exercises SET image = ? WHERE name = ? AND image = ''",
                   [(image, name) for name, image in IMAGES.items()])
    db.commit()
    db.close()


# ---------- Outils ----------
def parse_day(value):
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        return date.today()


def parse_kg(value, default=None):
    """Accepte « 62,5 » comme « 62.5 ». Lève ValueError si ce n'est pas un nombre."""
    value = (value or "").strip().replace(",", ".")
    if not value:
        if default is None:
            raise ValueError
        return default
    return float(value)


def week_start(d):
    return d - timedelta(days=d.weekday())


def sort_key(text):
    return unicodedata.normalize("NFD", text.lower()).encode("ascii", "ignore").decode()


def muscle_keys(text):
    return [m for m in (text or "").split(",") if m in MUSCLE_NAMES]


def muscle_label(text):
    return ", ".join(MUSCLE_NAMES[m] for m in muscle_keys(text))


def as_date(value):
    return date.fromisoformat(value) if isinstance(value, str) else value


def enrich_exercise(row):
    e = dict(row)
    e["primary_name"] = MUSCLE_NAMES.get(e["primary_muscle"], e["primary_muscle"])
    e["secondary_keys"] = muscle_keys(e["secondary"])
    e["secondary_list"] = [MUSCLE_NAMES[m] for m in e["secondary_keys"]]
    e["secondary_names"] = ", ".join(e["secondary_list"])
    e["image"] = e.get("image") or ""
    return e


def all_exercises(db):
    rows = db.execute("SELECT * FROM exercises").fetchall()
    return sorted((enrich_exercise(r) for r in rows), key=lambda e: sort_key(e["name"]))


def load_templates(db):
    rows = db.execute("SELECT * FROM templates").fetchall()
    templates = [dict(r, muscle_names=muscle_label(r["muscles"])) for r in rows]
    return sorted(templates, key=lambda t: (DAYS.index(t["day"]) if t["day"] in DAYS else 99, sort_key(t["name"])))


def bodyweight_on(db, day):
    """Poids du corps à une date : la dernière pesée avant, sinon la première connue."""
    row = db.execute("SELECT kg FROM bodyweight WHERE day <= ? ORDER BY day DESC, id DESC LIMIT 1", (day,)).fetchone()
    if row is None:
        row = db.execute("SELECT kg FROM bodyweight ORDER BY day, id LIMIT 1").fetchone()
    return row["kg"] if row else None


def set_tonnage(reps, weight, is_bodyweight, bw):
    if is_bodyweight:
        return reps * ((bw or 0) + weight)
    return reps * weight


def format_set(reps, weight, is_bodyweight):
    if is_bodyweight:
        return f"{reps}" + (f" (+{kg_filter(weight)})" if weight else "")
    return f"{reps}×{kg_filter(weight)}"


def session_details(db, session):
    bw = bodyweight_on(db, session["day"])
    rows = db.execute(
        """SELECT e.* FROM session_exercises se JOIN exercises e ON e.id = se.exercise_id
           WHERE se.session_id = ? ORDER BY se.position""",
        (session["id"],),
    ).fetchall()
    exercises, total, set_count, planned_count = [], 0.0, 0, 0
    for row in rows:
        sets = db.execute(
            "SELECT id, reps, weight, done FROM sets WHERE session_id = ? AND exercise_id = ? ORDER BY id",
            (session["id"], row["id"]),
        ).fetchall()
        done_sets = [s for s in sets if s["done"]]
        tonnage = sum(set_tonnage(s["reps"], s["weight"], row["bodyweight"], bw) for s in done_sets)
        exercises.append({
            "id": row["id"],
            "name": row["name"],
            "muscle": MUSCLE_NAMES.get(row["primary_muscle"], ""),
            "primary": row["primary_muscle"],
            "equipment": row["equipment"],
            "image": row["image"],
            "secondary": muscle_keys(row["secondary"]),
            "bodyweight": bool(row["bodyweight"]),
            "sets": sets,
            "done_sets": done_sets,
            "tonnage": tonnage,
        })
        total += tonnage
        set_count += len(done_sets)
        planned_count += len(sets) - len(done_sets)
    return {"exercises": exercises, "tonnage": total, "set_count": set_count, "planned_count": planned_count,
            "bodyweight": bw}


def last_performance(db, exercise_id, session, is_bodyweight):
    """Les séries faites sur cet exercice lors de la séance précédente."""
    prev = db.execute(
        """SELECT s.id, s.day FROM sessions s JOIN sets st ON st.session_id = s.id
           WHERE st.exercise_id = ? AND st.done = 1 AND s.done = 1 AND (s.day < ? OR (s.day = ? AND s.id < ?))
           ORDER BY s.day DESC, s.id DESC LIMIT 1""",
        (exercise_id, session["day"], session["day"], session["id"]),
    ).fetchone()
    if prev is None:
        return None
    sets = db.execute(
        "SELECT reps, weight FROM sets WHERE session_id = ? AND exercise_id = ? AND done = 1 ORDER BY id",
        (prev["id"], exercise_id),
    ).fetchall()
    return {
        "day": prev["day"],
        "max": max(s["weight"] for s in sets),
        "text": " · ".join(format_set(s["reps"], s["weight"], is_bodyweight) for s in sets),
        "first": {"reps": sets[0]["reps"], "weight": sets[0]["weight"]},
        "sets": [(s["reps"], s["weight"]) for s in sets],
    }


def record_set_id(db, exercise_id, session, sets):
    """La série de cette séance qui bat la meilleure série d'avant (plus lourde, puis plus de reps)."""
    if not sets:
        return None
    prev = db.execute(
        """SELECT st.weight, st.reps FROM sets st JOIN sessions s ON s.id = st.session_id
           WHERE st.exercise_id = ? AND st.done = 1 AND s.done = 1 AND (s.day < ? OR (s.day = ? AND s.id < ?))
           ORDER BY st.weight DESC, st.reps DESC LIMIT 1""",
        (exercise_id, session["day"], session["day"], session["id"]),
    ).fetchone()
    if prev is None:
        return None  # première fois : pas encore de record à battre
    best = max(sets, key=lambda s: (s["weight"], s["reps"]))
    return best["id"] if (best["weight"], best["reps"]) > (prev["weight"], prev["reps"]) else None


def last_max_weights(db):
    """Pour chaque exercice : la plus grosse charge (ou le plus gros lest) de la dernière séance où il a été fait."""
    rows = db.execute(
        """SELECT st.exercise_id, s.day, MAX(st.weight) AS weight FROM sets st JOIN sessions s ON s.id = st.session_id
           WHERE st.done = 1 AND s.done = 1 GROUP BY st.exercise_id, s.id ORDER BY s.day, s.id"""
    ).fetchall()
    return {r["exercise_id"]: {"weight": r["weight"], "day": r["day"]} for r in rows}


def get_session(db, session_id):
    row = db.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
    if row is None:
        abort(404)
    return row


def back_to_session(session_id, exercise_id=None):
    anchor = f"ex-{exercise_id}" if exercise_id else None
    return redirect(url_for("session_view", session_id=session_id, _anchor=anchor))


# ---------- Filtres d'affichage ----------
def get_setting(db, key, default):
    row = db.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
    return row["value"] if row else default


def week_prefs(db):
    """Réglages de la semaine : suggestions du programme affichées ou non (non par défaut), objectif de séances."""
    goal = get_setting(db, "objectif", "4")
    return {"suggestions": get_setting(db, "suggestions", "0") == "1",
            "goal": int(goal) if goal.isdigit() and 1 <= int(goal) <= 7 else 4}


@app.post("/reglages/semaine")
def set_week_prefs():
    db = get_db()
    values = {}
    if request.form.get("suggestions") in ("0", "1"):
        values["suggestions"] = request.form["suggestions"]
    if request.form.get("objectif", "").isdigit() and 1 <= int(request.form["objectif"]) <= 7:
        values["objectif"] = request.form["objectif"]
    for key, value in values.items():
        db.execute("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                   (key, value))
    db.commit()
    return redirect(url_for("programme"))


@app.post("/programme/<int:template_id>/jour")
def set_template_day(template_id):
    db = get_db()
    day = request.form.get("day", "")
    db.execute("UPDATE templates SET day = ? WHERE id = ?", (day if day in DAYS else "", template_id))
    db.commit()
    return redirect(url_for("programme"))


def body_sex():
    sex = get_setting(get_db(), "corps", "homme")
    return sex if sex in body.SHAPES else "homme"


# ---------- Mot de passe (seulement en ligne) ----------
@app.before_request
def require_login():
    if not PASSWORD or session.get("connecte"):
        return None
    if request.endpoint in ("login", "static", "manifest"):
        return None
    return redirect(url_for("login", suite=request.full_path if request.method == "GET" else None))


@app.route("/connexion", methods=["GET", "POST"])
def login():
    if not PASSWORD:
        return redirect(url_for("week"))
    error = False
    if request.method == "POST":
        if hmac.compare_digest(request.form.get("password", "").encode(), PASSWORD.encode()):
            session.clear()
            session.permanent = True
            session["connecte"] = True
            suite = request.args.get("suite", "")
            return redirect(suite if suite.startswith("/") and not suite.startswith("//") else url_for("week"))
        time.sleep(1)  # ralentit les essais au hasard
        error = True
    return render_template("login.html", error=error)


@app.post("/deconnexion")
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.route("/manifest.webmanifest")
def manifest():
    """Fiche d'installation de l'appli sur l'écran d'accueil du téléphone (PWA)."""
    return app.send_static_file("manifest.webmanifest"), 200, {"Content-Type": "application/manifest+json"}


@app.context_processor
def inject_helpers():
    """Rend disponibles partout : icon("nom"), equip("Barre") et les schémas du corps (homme ou femme selon le réglage)."""
    icons = app.jinja_env.get_template("_icons.html").module
    bodies = app.jinja_env.get_template("_body.html").module
    sex = body_sex()
    return {
        "icon": icons.icon, "equip": icons.equip, "body_sex": sex, "online": bool(PASSWORD),
        "body_sprite": lambda: bodies.body_sprite(sex),
        "body_mini": lambda primary, secondary=(): bodies.body_mini(sex, primary, list(secondary)),
        "body_map": lambda selected=None: bodies.body_map(sex, selected),
    }


@app.post("/reglages/corps")
def set_body_sex():
    sex = request.form.get("sexe")
    if sex in body.SHAPES:
        db = get_db()
        db.execute("INSERT INTO settings (key, value) VALUES ('corps', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                   (sex,))
        db.commit()
    retour = request.form.get("retour", "")
    return redirect(retour if retour.startswith("/") and not retour.startswith("//") else url_for("exercises"))


app.jinja_env.globals.update(BODY=body, MUSCLE_NAMES=MUSCLE_NAMES)


@app.template_filter("kg")
def kg_filter(value):
    if value is None:
        return "–"
    value = round(float(value), 2)
    text = f"{value:,.0f}" if value == int(value) else f"{value:,.1f}"
    return text.replace(",", " ").replace(".", ",")


@app.template_filter("charge")
def charge_filter(weight, is_bodyweight=False):
    """« 90 kg », ou pour un exercice au poids du corps : « PDC + 10 kg » / « PDC »."""
    if is_bodyweight:
        return f"PDC + {kg_filter(weight)} kg" if weight else "PDC"
    return f"{kg_filter(weight)} kg"


@app.template_filter("court")
def court_filter(name):
    """Nom très court pour le calendrier : « Quadriceps / Fessiers » -> « Quadri. »."""
    words = (name or "").split("/")[0].split()
    word = words[0] if words else ""
    known = {"quadriceps": "Quadri", "quadri": "Quadri", "pectoraux": "Pecs", "abdominaux": "Abdos",
             "ischios": "Ischios", "ischio-jambiers": "Ischios", "trapèzes": "Trapèz.", "adducteurs": "Adduct."}
    return known.get(word.lower(), word if len(word) <= 6 else word[:5] + ".")


@app.template_filter("kgin")
def kg_input_filter(value):
    if not value:
        return ""
    return kg_filter(value).replace(" ", "")


@app.template_filter("jour")
def jour_filter(value):
    d = as_date(value)
    return f"{DAYS[d.weekday()]} {d.day} {MOIS[d.month - 1]}"


@app.template_filter("jour_court")
def jour_court_filter(value):
    d = as_date(value)
    return f"{d.day} {MOIS_COURTS[d.month - 1]}"


# ---------- Semaine ----------
@app.route("/")
def week():
    db = get_db()
    today = date.today()
    start = week_start(parse_day(request.args.get("semaine")))
    end = start + timedelta(days=6)
    rows = db.execute(
        "SELECT * FROM sessions WHERE day BETWEEN ? AND ? ORDER BY day, id",
        (start.isoformat(), end.isoformat()),
    ).fetchall()
    prefs = week_prefs(db)
    planned = {t["day"]: t for t in load_templates(db) if t["day"]} if prefs["suggestions"] else {}

    totals = {"sessions": sum(1 for s in rows if s["done"]), "sets": 0, "tonnage": 0.0}
    days = []
    for i in range(7):
        d = start + timedelta(days=i)
        sessions = []
        for s in rows:
            if s["day"] == d.isoformat():
                details = session_details(db, s)
                if s["done"]:
                    totals["sets"] += details["set_count"]
                    totals["tonnage"] += details["tonnage"]
                sessions.append({"id": s["id"], "name": s["name"], "done": s["done"], "details": details})
        days.append({"date": d, "is_today": d == today, "is_future": d > today, "sessions": sessions,
                     "planned": planned.get(DAYS[i])})

    planned_days = [d for d in days if d["planned"]]
    for d in days:
        d["validated"] = any(s["done"] for s in d["sessions"])
    done_days = sum(1 for d in days if d["validated"])
    goal = prefs["goal"]
    today_info = next((d for d in days if d["is_today"]), None)
    today_plan = None
    if today_info and today_info["planned"]:
        t = today_info["planned"]
        today_plan = dict(t, cover=COVERS.get((muscle_keys(t["muscles"]) or [""])[0], ""),
                          done=today_info["sessions"][0] if today_info["sessions"] else None)
    elif today_info and today_info["sessions"]:  # séance du jour sans suggestion du programme
        s = today_info["sessions"][0]
        exos = s["details"]["exercises"]
        today_plan = {"name": s["name"], "muscle_names": ", ".join(dict.fromkeys(e["muscle"] for e in exos)),
                      "cover": next((e["image"] for e in exos if e["image"]), ""), "done": s}
    hour = datetime.now().hour
    greeting = "Bonjour" if 5 <= hour < 18 else "Bonsoir"
    return render_template(
        "week.html", nav="semaine", days=days, totals=totals, start=start, end=end, greeting=greeting,
        today_plan=today_plan, done_days=done_days, goal=goal, ring=min(100, round(100 * done_days / goal)),
        prev=(start - timedelta(days=7)).isoformat(), next=(start + timedelta(days=7)).isoformat(),
        is_current=start == week_start(today),
    )


# ---------- Séances ----------
@app.route("/seance/nouvelle", methods=["GET", "POST"])
def new_session():
    db = get_db()
    if request.method == "POST":
        day = parse_day(request.form.get("day"))
        choice = request.form.get("choice", "")
        if request.form.get("template_id"):  # boutons « Commencer » / « Préparer » de la page Semaine
            choice = "t" + request.form["template_id"]
        template = favorite = None
        if choice.startswith("t") and choice[1:].isdigit():
            template = db.execute("SELECT * FROM templates WHERE id = ?", (int(choice[1:]),)).fetchone()
        elif choice.startswith("f") and choice[1:].isdigit():
            favorite = db.execute("SELECT * FROM favorites WHERE id = ?", (int(choice[1:]),)).fetchone()
        source = favorite or template
        name = request.form.get("name", "").strip() or (source["name"] if source else "Séance libre")
        cur = db.execute(
            "INSERT INTO sessions (day, name, muscles, done, favorite_id) VALUES (?, ?, ?, 0, ?)",
            (day.isoformat(), name[:80], source["muscles"] if source else "", favorite["id"] if favorite else None),
        )
        session_id = cur.lastrowid
        if favorite:
            copy_favorite_into_session(db, favorite["id"], session_id)
        db.commit()
        return redirect(url_for("session_view", session_id=session_id))

    templates = load_templates(db)
    favorites = load_favorites(db)
    today = date.today()
    day = parse_day(request.args.get("day"))
    chosen = request.args.get("favori", type=int)
    if chosen and any(f["id"] == chosen for f in favorites):
        suggested = f"f{chosen}"
    else:
        suggested = ""
        if week_prefs(db)["suggestions"]:
            suggested = next((f"t{t['id']}" for t in templates if t["day"] == DAYS[day.weekday()]), "")
    quick = [(today + timedelta(days=i), label) for i, label in [(-1, "Hier"), (0, "Aujourd'hui"), (1, "Demain")]]
    recent = [dict(s, details=session_details(db, s))
              for s in db.execute("SELECT * FROM sessions ORDER BY day DESC, id DESC LIMIT 5").fetchall()]
    return render_template("new_session.html", nav="seance", templates=templates, favorites=favorites, day=day,
                           today=today, quick=quick, suggested=suggested, recent=recent)


@app.route("/seances")
def history():
    """Toutes les séances, de la plus récente à la plus ancienne, groupées par mois."""
    db = get_db()
    months = []
    for s in db.execute("SELECT * FROM sessions ORDER BY day DESC, id DESC").fetchall():
        d = as_date(s["day"])
        label = f"{MOIS[d.month - 1].capitalize()} {d.year}"
        if not months or months[-1]["label"] != label:
            months.append({"label": label, "sessions": [], "tonnage": 0.0})
        details = session_details(db, s)
        months[-1]["sessions"].append(dict(s, details=details))
        months[-1]["tonnage"] += details["tonnage"]
    return render_template("history.html", nav="semaine", months=months)


@app.route("/seance/<int:session_id>")
def session_view(session_id):
    db = get_db()
    session = get_session(db, session_id)
    details = session_details(db, session)
    for e in details["exercises"]:
        e["last"] = last_performance(db, e["id"], session, e["bodyweight"])
        e["record_set"] = record_set_id(db, e["id"], session, e["done_sets"])
        plan = default_plan(db, e["id"], session)
        e["prefill"] = {"count": max(len(e["sets"]), 1) if e["sets"] else 3,
                        "reps": e["sets"][-1]["reps"] if e["sets"] else plan[0][0],
                        "weight": e["sets"][-1]["weight"] if e["sets"] else plan[0][1]}
    needs_bw = details["bodyweight"] is None and any(e["bodyweight"] for e in details["exercises"])
    favorite = None
    if session["favorite_id"]:
        favorite = db.execute("SELECT * FROM favorites WHERE id = ?", (session["favorite_id"],)).fetchone()
    today = date.today()
    quick_days = [(today + timedelta(days=i), label) for i, label in [(0, "Aujourd'hui"), (1, "Demain"), (2, "Après-demain")]]
    return render_template("session.html", nav="seance", session=session, details=details, needs_bw=needs_bw,
                           favorite=favorite, is_future=as_date(session["day"]) > today, quick_days=quick_days)


@app.route("/seance/<int:session_id>/exercices")
def pick_exercise(session_id):
    db = get_db()
    session = get_session(db, session_id)
    used = {r[0] for r in db.execute("SELECT exercise_id FROM session_exercises WHERE session_id = ?", (session_id,))}
    exercises = [e for e in all_exercises(db) if e["id"] not in used]
    last = last_max_weights(db)
    for e in exercises:
        e["last"] = last.get(e["id"])
    suggested = muscle_keys(session["muscles"])
    order = suggested + [k for k, _ in MUSCLES if k not in suggested]
    groups = []
    for key in order:
        items = [e for e in exercises if e["primary_muscle"] == key]
        if items:
            groups.append({"name": MUSCLE_NAMES[key], "suggested": key in suggested, "exercises": items})
    return render_template("pick_exercise.html", nav="seance", session=session, groups=groups,
                           has_suggested=bool(suggested))


@app.post("/seance/<int:session_id>/exercices")
def add_exercise_to_session(session_id):
    db = get_db()
    get_session(db, session_id)
    exercise_id = request.form.get("exercise_id", type=int)
    if not db.execute("SELECT 1 FROM exercises WHERE id = ?", (exercise_id,)).fetchone():
        abort(400)
    add_to_session(db, session_id, exercise_id)
    return back_to_session(session_id, exercise_id)


def add_to_session(db, session_id, exercise_id, plan=None):
    """Ajoute l'exercice à la séance avec ses séries prévues (par défaut : 3 séries, valeurs de la dernière fois)."""
    position = db.execute("SELECT COALESCE(MAX(position), 0) + 1 FROM session_exercises WHERE session_id = ?",
                          (session_id,)).fetchone()[0]
    cur = db.execute("INSERT OR IGNORE INTO session_exercises (session_id, exercise_id, position) VALUES (?, ?, ?)",
                     (session_id, exercise_id, position))
    if cur.rowcount:
        if plan is None:
            plan = default_plan(db, exercise_id, get_session(db, session_id))
        insert_planned_sets(db, session_id, exercise_id, plan)
    db.commit()


def default_plan(db, exercise_id, session, count=3):
    """Séries proposées : celles de la dernière fois (3 par défaut), sinon 3 × 10 répétitions."""
    last = last_performance(db, exercise_id, session, False)
    values = last["sets"][:count] if last else []
    while len(values) < count:
        values.append(values[-1] if values else (10, 0.0))
    return values


def insert_planned_sets(db, session_id, exercise_id, plan):
    now = datetime.now().isoformat(timespec="seconds")
    db.executemany("INSERT INTO sets (session_id, exercise_id, reps, weight, created, done) VALUES (?, ?, ?, ?, ?, 0)",
                   [(session_id, exercise_id, reps, weight, now) for reps, weight in plan])


def read_set_values(form):
    """Répétitions et charge envoyées par un formulaire. Lève ValueError si elles ne sont pas valables."""
    reps = int(form.get("reps", ""))
    weight = parse_kg(form.get("weight"), 0.0)
    if not (1 <= reps <= 1000 and 0 <= weight <= 1000):
        raise ValueError
    return reps, weight


def get_set(db, set_id):
    row = db.execute("SELECT * FROM sets WHERE id = ?", (set_id,)).fetchone()
    if row is None:
        abort(404)
    return row


@app.post("/seance/<int:session_id>/serie")
def add_set(session_id):
    db = get_db()
    get_session(db, session_id)
    exercise_id = request.form.get("exercise_id", type=int)
    if not db.execute("SELECT 1 FROM session_exercises WHERE session_id = ? AND exercise_id = ?",
                      (session_id, exercise_id)).fetchone():
        abort(400)
    last = db.execute("SELECT reps, weight FROM sets WHERE session_id = ? AND exercise_id = ? ORDER BY id DESC LIMIT 1",
                      (session_id, exercise_id)).fetchone()
    plan = [(last["reps"], last["weight"])] if last else default_plan(db, exercise_id, get_session(db, session_id), 1)
    insert_planned_sets(db, session_id, exercise_id, plan)
    db.commit()
    return back_to_session(session_id, exercise_id)


@app.post("/serie/<int:set_id>/cocher")
def toggle_set(set_id):
    """Coche une série prévue (avec les valeurs saisies), ou la décoche."""
    db = get_db()
    row = get_set(db, set_id)
    if row["done"]:
        db.execute("UPDATE sets SET done = 0 WHERE id = ?", (set_id,))
    else:
        try:
            reps, weight = read_set_values(request.form)
        except ValueError:
            flash("Vérifie le nombre de répétitions et la charge.", "error")
            return back_to_session(row["session_id"], row["exercise_id"])
        db.execute("UPDATE sets SET reps = ?, weight = ?, done = 1, created = ? WHERE id = ?",
                   (reps, weight, datetime.now().isoformat(timespec="seconds"), set_id))
    db.commit()
    return back_to_session(row["session_id"], row["exercise_id"])


@app.post("/serie/<int:set_id>/modifier")
def update_set(set_id):
    """Enregistre les répétitions et la charge d'une série (appelé automatiquement quand on modifie un champ)."""
    db = get_db()
    row = get_set(db, set_id)
    try:
        reps, weight = read_set_values(request.form)
    except ValueError:
        return ("", 400) if request.headers.get("X-Muscu-Fetch") else back_to_session(row["session_id"], row["exercise_id"])
    db.execute("UPDATE sets SET reps = ?, weight = ? WHERE id = ?", (reps, weight, set_id))
    db.commit()
    if request.headers.get("X-Muscu-Fetch"):
        return "", 204
    return back_to_session(row["session_id"], row["exercise_id"])


@app.post("/seance/<int:session_id>/prevoir/<int:exercise_id>")
def plan_sets(session_id, exercise_id):
    """Remplace les séries prévues (non cochées) d'un exercice : nombre de séries, répétitions, charge."""
    db = get_db()
    get_session(db, session_id)
    try:
        count = int(request.form.get("count", ""))
        reps, weight = read_set_values(request.form)
        if not 1 <= count <= 20:
            raise ValueError
    except ValueError:
        flash("Vérifie le nombre de séries, de répétitions et la charge.", "error")
        return back_to_session(session_id, exercise_id)
    done = db.execute("SELECT COUNT(*) FROM sets WHERE session_id = ? AND exercise_id = ? AND done = 1",
                      (session_id, exercise_id)).fetchone()[0]
    db.execute("DELETE FROM sets WHERE session_id = ? AND exercise_id = ? AND done = 0", (session_id, exercise_id))
    insert_planned_sets(db, session_id, exercise_id, [(reps, weight)] * max(count - done, 0))
    db.commit()
    return back_to_session(session_id, exercise_id)


@app.post("/seance/<int:session_id>/valider")
def validate_session(session_id):
    db = get_db()
    session = get_session(db, session_id)
    if session["done"]:
        db.execute("UPDATE sessions SET done = 0 WHERE id = ?", (session_id,))
        flash("La séance est de nouveau « prévue ».")
    else:
        db.execute("UPDATE sessions SET done = 1 WHERE id = ?", (session_id,))
        left = db.execute("SELECT COUNT(*) FROM sets WHERE session_id = ? AND done = 0", (session_id,)).fetchone()[0]
        flash("Séance validée, bravo !" + (f" {left} série{'s' if left > 1 else ''} non cochée{'s' if left > 1 else ''} "
                                         "ne compte" + ("nt" if left > 1 else "") + " pas." if left else ""))
    db.commit()
    return back_to_session(session_id)


@app.post("/seance/<int:session_id>/deplacer")
def move_session(session_id):
    db = get_db()
    get_session(db, session_id)
    day = parse_day(request.form.get("day"))
    db.execute("UPDATE sessions SET day = ? WHERE id = ?", (day.isoformat(), session_id))
    db.commit()
    flash(f"Séance déplacée au {jour_filter(day).lower()}.")
    if request.headers.get("X-Muscu-Fetch"):  # glisser-déposer depuis le calendrier de la semaine
        return "", 204
    return back_to_session(session_id)


# ---------- Favoris ----------
def load_favorites(db):
    favorites = []
    for f in db.execute("SELECT * FROM favorites ORDER BY name COLLATE NOCASE").fetchall():
        rows = db.execute(
            """SELECT e.name, COUNT(*) AS n FROM favorite_sets fs JOIN exercises e ON e.id = fs.exercise_id
               WHERE fs.favorite_id = ? GROUP BY fs.exercise_id ORDER BY MIN(fs.position)""", (f["id"],)).fetchall()
        favorites.append(dict(f, exercises=[{"name": r["name"], "sets": r["n"]} for r in rows],
                              muscle_names=muscle_label(f["muscles"])))
    return favorites


def copy_favorite_into_session(db, favorite_id, session_id):
    rows = db.execute("SELECT exercise_id, reps, weight FROM favorite_sets WHERE favorite_id = ? ORDER BY position, id",
                      (favorite_id,)).fetchall()
    plans = {}
    for r in rows:
        plans.setdefault(r["exercise_id"], []).append((r["reps"], r["weight"]))
    for exercise_id, plan in plans.items():
        add_to_session(db, session_id, exercise_id, plan)


@app.post("/seance/<int:session_id>/favori")
def save_favorite(session_id):
    """Enregistre la séance (exercices + séries prévues) en favori, ou met à jour son favori d'origine."""
    db = get_db()
    session = get_session(db, session_id)
    rows = db.execute(
        """SELECT st.exercise_id, st.reps, st.weight, se.position FROM sets st
           JOIN session_exercises se ON se.session_id = st.session_id AND se.exercise_id = st.exercise_id
           WHERE st.session_id = ? ORDER BY se.position, st.id""", (session_id,)).fetchall()
    if not rows:
        flash("Ajoute au moins un exercice avant d'enregistrer la séance en favori.", "error")
        return back_to_session(session_id)
    favorite_id = session["favorite_id"]
    exists = favorite_id and db.execute("SELECT 1 FROM favorites WHERE id = ?", (favorite_id,)).fetchone()
    if exists and request.form.get("mode") != "nouveau":
        db.execute("UPDATE favorites SET name = ?, muscles = ? WHERE id = ?", (session["name"], session["muscles"], favorite_id))
        db.execute("DELETE FROM favorite_sets WHERE favorite_id = ?", (favorite_id,))
        message = "Favori mis à jour."
    else:
        favorite_id = db.execute("INSERT INTO favorites (name, muscles) VALUES (?, ?)",
                                 (session["name"], session["muscles"])).lastrowid
        db.execute("UPDATE sessions SET favorite_id = ? WHERE id = ?", (favorite_id, session_id))
        message = "Séance ajoutée à tes favoris."
    db.executemany("INSERT INTO favorite_sets (favorite_id, exercise_id, position, reps, weight) VALUES (?, ?, ?, ?, ?)",
                   [(favorite_id, r["exercise_id"], r["position"], r["reps"], r["weight"]) for r in rows])
    db.commit()
    flash(message)
    return back_to_session(session_id)


@app.post("/favoris/<int:favorite_id>/supprimer")
def delete_favorite(favorite_id):
    db = get_db()
    db.execute("UPDATE sessions SET favorite_id = NULL WHERE favorite_id = ?", (favorite_id,))
    db.execute("DELETE FROM favorites WHERE id = ?", (favorite_id,))
    db.commit()
    flash("Favori supprimé.")
    return redirect(url_for("programme"))


@app.post("/serie/<int:set_id>/supprimer")
def delete_set(set_id):
    db = get_db()
    row = db.execute("SELECT session_id, exercise_id FROM sets WHERE id = ?", (set_id,)).fetchone()
    if row is None:
        abort(404)
    db.execute("DELETE FROM sets WHERE id = ?", (set_id,))
    db.commit()
    return back_to_session(row["session_id"], row["exercise_id"])


@app.post("/seance/<int:session_id>/retirer/<int:exercise_id>")
def remove_exercise(session_id, exercise_id):
    db = get_db()
    db.execute("DELETE FROM sets WHERE session_id = ? AND exercise_id = ?", (session_id, exercise_id))
    db.execute("DELETE FROM session_exercises WHERE session_id = ? AND exercise_id = ?", (session_id, exercise_id))
    db.commit()
    return back_to_session(session_id)


@app.post("/seance/<int:session_id>/modifier")
def edit_session(session_id):
    db = get_db()
    get_session(db, session_id)
    name = request.form.get("name", "").strip()[:80] or "Séance"
    db.execute("UPDATE sessions SET name = ?, day = ?, notes = ? WHERE id = ?",
               (name, parse_day(request.form.get("day")).isoformat(),
                request.form.get("notes", "").strip()[:1000], session_id))
    db.commit()
    flash("Séance enregistrée.")
    return back_to_session(session_id)


@app.post("/seance/<int:session_id>/supprimer")
def delete_session(session_id):
    db = get_db()
    session = get_session(db, session_id)
    db.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
    db.commit()
    flash("Séance supprimée.")
    return redirect(url_for("week", semaine=session["day"]))


# ---------- Guide des exercices ----------
@app.route("/exercices")
def exercises():
    db = get_db()
    muscle = request.args.get("muscle")
    if muscle not in MUSCLE_NAMES:
        muscle = None
    exs = all_exercises(db)
    last = last_max_weights(db)
    for e in exs:
        e["last"] = last.get(e["id"])
    if muscle:
        groups = [
            {"name": f"{MUSCLE_NAMES[muscle]} : muscle principal", "exercises": [e for e in exs if e["primary_muscle"] == muscle]},
            {"name": "Travaillent aussi ce muscle", "exercises": [e for e in exs if muscle in e["secondary_keys"]]},
        ]
    else:
        groups = [{"name": name, "exercises": [e for e in exs if e["primary_muscle"] == key]} for key, name in MUSCLES]
    groups = [grp for grp in groups if grp["exercises"]]
    return render_template("exercises.html", nav="exercices", groups=groups, muscle=muscle, muscles=MUSCLES,
                           muscle_name=MUSCLE_NAMES.get(muscle))


@app.route("/exercices/<int:exercise_id>")
def exercise_detail(exercise_id):
    """Fiche d'un exercice : photos « comment faire », muscles, conseils, dernière charge et record."""
    db = get_db()
    row = db.execute("SELECT * FROM exercises WHERE id = ?", (exercise_id,)).fetchone()
    if row is None:
        abort(404)
    ex = enrich_exercise(row)
    ex["last"] = last_max_weights(db).get(exercise_id)
    summary = exercise_summaries(load_sets(db, exercise_id=exercise_id))
    retour = request.args.get("retour", type=int)
    in_session = bool(retour) and db.execute(
        "SELECT 1 FROM session_exercises WHERE session_id = ? AND exercise_id = ?", (retour, exercise_id)).fetchone()
    return render_template("exercise_detail.html", nav="exercices", ex=ex, summary=summary[0] if summary else None,
                           retour=retour, in_session=bool(in_session))


@app.route("/exercices/nouveau", methods=["GET", "POST"])
def new_exercise():
    return exercise_form(None)


@app.route("/exercices/<int:exercise_id>/modifier", methods=["GET", "POST"])
def edit_exercise(exercise_id):
    return exercise_form(exercise_id)


def exercise_form(exercise_id):
    db = get_db()
    row = None
    if exercise_id:
        row = db.execute("SELECT * FROM exercises WHERE id = ?", (exercise_id,)).fetchone()
        if row is None:
            abort(404)
    retour = request.args.get("retour", type=int)
    values = enrich_exercise(row) if row else {
        "name": "", "primary_muscle": request.args.get("muscle", ""), "secondary_keys": [],
        "equipment": "", "bodyweight": 0, "tips": "",
    }

    if request.method == "POST":
        primary = request.form.get("primary_muscle", "")
        values = {
            "name": request.form.get("name", "").strip()[:80],
            "primary_muscle": primary,
            "secondary_keys": [m for m in request.form.getlist("secondary") if m in MUSCLE_NAMES and m != primary],
            "equipment": request.form.get("equipment", "").strip()[:40],
            "bodyweight": 1 if request.form.get("bodyweight") else 0,
            "tips": request.form.get("tips", "").strip()[:500],
        }
        if not values["name"] or primary not in MUSCLE_NAMES:
            flash("Indique au moins un nom et un muscle principal.", "error")
        else:
            params = (values["name"], primary, ",".join(values["secondary_keys"]), values["equipment"],
                      values["bodyweight"], values["tips"])
            try:
                if row:
                    db.execute("""UPDATE exercises SET name = ?, primary_muscle = ?, secondary = ?, equipment = ?,
                                  bodyweight = ?, tips = ? WHERE id = ?""", params + (exercise_id,))
                    new_id = exercise_id
                else:
                    cur = db.execute("""INSERT INTO exercises (name, primary_muscle, secondary, equipment, bodyweight,
                                        tips, custom) VALUES (?, ?, ?, ?, ?, ?, 1)""", params)
                    new_id = cur.lastrowid
                db.commit()
            except sqlite3.IntegrityError:
                flash("Un exercice porte déjà ce nom.", "error")
            else:
                if retour:
                    get_session(db, retour)
                    add_to_session(db, retour, new_id)
                    return back_to_session(retour, new_id)
                flash("Exercice enregistré.")
                return redirect(url_for("exercises", muscle=primary))

    used = bool(exercise_id) and db.execute("SELECT 1 FROM session_exercises WHERE exercise_id = ? LIMIT 1",
                                            (exercise_id,)).fetchone() is not None
    return render_template("exercise_form.html", nav="exercices", ex=values, exercise_id=exercise_id, used=used,
                           retour=retour, muscles=MUSCLES, equipments=EQUIPMENTS)


@app.post("/exercices/<int:exercise_id>/supprimer")
def delete_exercise(exercise_id):
    db = get_db()
    if db.execute("SELECT 1 FROM session_exercises WHERE exercise_id = ? LIMIT 1", (exercise_id,)).fetchone():
        flash("Cet exercice est utilisé dans une séance : il ne peut pas être supprimé.", "error")
        return redirect(url_for("edit_exercise", exercise_id=exercise_id))
    db.execute("DELETE FROM favorite_sets WHERE exercise_id = ?", (exercise_id,))
    db.execute("DELETE FROM exercises WHERE id = ?", (exercise_id,))
    db.commit()
    flash("Exercice supprimé.")
    return redirect(url_for("exercises"))


# ---------- Programme ----------
@app.route("/programme")
def programme():
    db = get_db()
    return render_template("programme.html", nav="programme", templates=load_templates(db),
                           favorites=load_favorites(db), prefs=week_prefs(db), days=DAYS)


@app.route("/programme/nouveau", methods=["GET", "POST"])
def new_template():
    return template_form(None)


@app.route("/programme/<int:template_id>/modifier", methods=["GET", "POST"])
def edit_template(template_id):
    return template_form(template_id)


def template_form(template_id):
    db = get_db()
    row = None
    if template_id:
        row = db.execute("SELECT * FROM templates WHERE id = ?", (template_id,)).fetchone()
        if row is None:
            abort(404)
    values = {"name": row["name"], "day": row["day"], "muscles": muscle_keys(row["muscles"])} if row else \
        {"name": "", "day": "", "muscles": []}

    if request.method == "POST":
        values = {
            "name": request.form.get("name", "").strip()[:80],
            "day": request.form.get("day") if request.form.get("day") in DAYS else "",
            "muscles": [m for m in request.form.getlist("muscles") if m in MUSCLE_NAMES],
        }
        if not values["name"] or not values["muscles"]:
            flash("Indique un nom et au moins un groupe musculaire.", "error")
        else:
            params = (values["name"], values["day"], ",".join(values["muscles"]))
            if row:
                db.execute("UPDATE templates SET name = ?, day = ?, muscles = ? WHERE id = ?", params + (template_id,))
            else:
                db.execute("INSERT INTO templates (name, day, muscles) VALUES (?, ?, ?)", params)
            db.commit()
            flash("Programme enregistré.")
            return redirect(url_for("programme"))

    return render_template("template_form.html", nav="programme", t=values, template_id=template_id,
                           muscles=MUSCLES, days=DAYS)


@app.post("/programme/<int:template_id>/supprimer")
def delete_template(template_id):
    db = get_db()
    db.execute("DELETE FROM templates WHERE id = ?", (template_id,))
    db.commit()
    flash("Séance type supprimée.")
    return redirect(url_for("programme"))


# ---------- Progrès (graphiques) ----------
PERIODS = [("1m", "1 mois", 30), ("3m", "3 mois", 91), ("6m", "6 mois", 182), ("1a", "1 an", 365), ("tout", "Tout", None)]


def period_from_request():
    key = request.args.get("periode", "3m")
    for k, label, days in PERIODS:
        if k == key:
            return k, (date.today() - timedelta(days=days - 1)) if days else None
    return "3m", date.today() - timedelta(days=90)


def one_rm(reps, load):
    """1RM estimé (formule d'Epley)."""
    return load if reps <= 1 else load * (1 + reps / 30)


def load_sets(db, since=None, exercise_id=None, muscle=None):
    """Toutes les séries, avec la date de la séance, la charge réelle et le tonnage."""
    query = """SELECT st.reps, st.weight, s.id AS session_id, s.day, e.id AS exercise_id, e.name,
                      e.primary_muscle, e.bodyweight
               FROM sets st JOIN sessions s ON s.id = st.session_id JOIN exercises e ON e.id = st.exercise_id
               WHERE st.done = 1 AND s.done = 1"""
    params = []
    if since:
        query += " AND s.day >= ?"
        params.append(since.isoformat())
    if exercise_id:
        query += " AND e.id = ?"
        params.append(exercise_id)
    if muscle:
        query += " AND e.primary_muscle = ?"
        params.append(muscle)
    query += " ORDER BY s.day, s.id, st.id"
    bw_cache, result = {}, []
    for r in db.execute(query, params):
        if r["day"] not in bw_cache:
            bw_cache[r["day"]] = bodyweight_on(db, r["day"])
        bw = bw_cache[r["day"]]
        load = ((bw or 0) + r["weight"]) if r["bodyweight"] else r["weight"]
        result.append(dict(r, load=load, tonnage=r["reps"] * load))
    return result


def tonnage_over_time(sets, since):
    """Tonnage par semaine (ou par mois si la période est longue), semaines vides comprises."""
    today = date.today()
    first = since or (as_date(sets[0]["day"]) if sets else today)
    start = week_start(first)
    weeks = (week_start(today) - start).days // 7 + 1
    if weeks <= 26:
        buckets = {start + timedelta(days=7 * i): 0.0 for i in range(weeks)}
        for s in sets:
            buckets[week_start(as_date(s["day"]))] += s["tonnage"]
        return [{"label": f"Sem. du {jour_court_filter(d)}", "short": jour_court_filter(d), "date": d.isoformat(),
                 "value": round(v, 1)} for d, v in buckets.items()]
    buckets, d = {}, first.replace(day=1)
    while d <= today:
        buckets[d] = 0.0
        d = (d + timedelta(days=32)).replace(day=1)
    for s in sets:
        buckets[as_date(s["day"]).replace(day=1)] += s["tonnage"]
    return [{"label": f"{MOIS[d.month - 1].capitalize()} {d.year}", "short": f"{MOIS_COURTS[d.month - 1]}",
             "date": d.isoformat(), "value": round(v, 1)} for d, v in buckets.items()]


def best_set_text(s, is_bodyweight):
    if is_bodyweight:
        return f"{s['reps']} reps" + (f" + {kg_filter(s['weight'])} kg" if s["weight"] else "")
    return f"{s['reps']} × {kg_filter(s['weight'])} kg"


def exercise_summaries(sets):
    """Pour chaque exercice pratiqué : meilleure série, dernière fois, nombre de séances."""
    by_ex = {}
    for s in sets:
        e = by_ex.setdefault(s["exercise_id"], {
            "id": s["exercise_id"], "name": s["name"], "bodyweight": bool(s["bodyweight"]),
            "muscle": MUSCLE_NAMES.get(s["primary_muscle"], ""), "best": s, "last": s["day"], "sessions": set(),
        })
        if (s["weight"], s["reps"]) > (e["best"]["weight"], e["best"]["reps"]):
            e["best"] = s
        e["last"] = max(e["last"], s["day"])
        e["sessions"].add(s["session_id"])
    result = []
    for e in by_ex.values():
        e["best_text"] = best_set_text(e["best"], e["bodyweight"])
        e["session_count"] = len(e.pop("sessions"))
        result.append(e)
    return sorted(result, key=lambda e: e["last"], reverse=True)


@app.route("/progres")
def progress():
    db = get_db()
    period, since = period_from_request()
    sets = load_sets(db, since)
    per_muscle = {}
    for s in sets:
        per_muscle[s["primary_muscle"]] = per_muscle.get(s["primary_muscle"], 0) + s["tonnage"]
    top = max(per_muscle.values(), default=0) or 1
    muscles = [{"key": k, "name": MUSCLE_NAMES.get(k, k), "tonnage": v, "pct": round(100 * v / top, 1)}
               for k, v in sorted(per_muscle.items(), key=lambda kv: -kv[1])]
    totals = {"sessions": len({s["session_id"] for s in sets}), "sets": len(sets),
              "tonnage": sum(s["tonnage"] for s in sets)}
    chart = {"type": "line", "zero": True, "unit": "kg", "points": tonnage_over_time(sets, since)} if sets else None
    return render_template("progress.html", nav="progres", periods=PERIODS, period=period, totals=totals,
                           chart=chart, muscles=muscles, exercises=exercise_summaries(load_sets(db)))


@app.route("/progres/exercice/<int:exercise_id>")
def progress_exercise(exercise_id):
    db = get_db()
    row = db.execute("SELECT * FROM exercises WHERE id = ?", (exercise_id,)).fetchone()
    if row is None:
        abort(404)
    ex = enrich_exercise(row)
    is_bw = bool(ex["bodyweight"])
    sessions = {}
    for s in load_sets(db, exercise_id=exercise_id):
        sessions.setdefault(s["session_id"], {"id": s["session_id"], "day": s["day"], "sets": []})["sets"].append(s)

    history = []
    for sess in sessions.values():
        sets = sess["sets"]
        history.append({
            "id": sess["id"], "day": sess["day"],
            "text": " · ".join(format_set(s["reps"], s["weight"], is_bw) for s in sets),
            "max_weight": max(s["weight"] for s in sets),
            "max_reps": max(s["reps"] for s in sets),
            "one_rm": max(one_rm(s["reps"], s["load"]) for s in sets),
            "tonnage": sum(s["tonnage"] for s in sets),
            "best": max(sets, key=lambda s: (s["weight"], s["reps"])),
        })

    def points(key):
        return [{"label": jour_court_filter(h["day"]), "date": h["day"], "value": round(h[key], 1)} for h in history]

    if is_bw:
        metrics = [("max_reps", "Reps max", "reps"), ("max_weight", "Lest max", "kg"), ("tonnage", "Tonnage", "kg")]
    else:
        metrics = [("max_weight", "Charge max", "kg"), ("one_rm", "1RM estimé", "kg"), ("tonnage", "Tonnage", "kg")]
    charts = [{"key": k, "label": label, "type": "line", "unit": unit, "points": points(k)} for k, label, unit in metrics]

    records = None
    if history:
        best = max(history, key=lambda h: (h["best"]["weight"], h["best"]["reps"]))
        records = {
            "best_set": best_set_text(best["best"], is_bw), "best_set_day": best["day"],
            "one_rm": max(history, key=lambda h: h["one_rm"]),
            "max_reps": max(history, key=lambda h: h["max_reps"]),
            "tonnage": max(history, key=lambda h: h["tonnage"]),
        }
    return render_template("progress_exercise.html", nav="progres", ex=ex, charts=charts, records=records,
                           history=list(reversed(history)))


@app.route("/progres/muscle/<muscle>")
def progress_muscle(muscle):
    if muscle not in MUSCLE_NAMES:
        abort(404)
    db = get_db()
    period, since = period_from_request()
    sets = load_sets(db, since, muscle=muscle)
    chart = {"type": "line", "zero": True, "unit": "kg", "points": tonnage_over_time(sets, since)} if sets else None
    exercises = {}
    for s in sets:
        e = exercises.setdefault(s["exercise_id"], {"id": s["exercise_id"], "name": s["name"], "tonnage": 0.0,
                                                    "sets": 0})
        e["tonnage"] += s["tonnage"]
        e["sets"] += 1
    return render_template("progress_muscle.html", nav="progres", muscle=muscle, muscle_name=MUSCLE_NAMES[muscle],
                           periods=PERIODS, period=period, chart=chart, total=sum(s["tonnage"] for s in sets),
                           exercises=sorted(exercises.values(), key=lambda e: -e["tonnage"]))


# ---------- Poids du corps ----------
@app.route("/poids", methods=["GET", "POST"])
def weight():
    db = get_db()
    if request.method == "POST":
        try:
            kg = parse_kg(request.form.get("kg"))
            if not 20 <= kg <= 400:
                raise ValueError
        except ValueError:
            flash("Indique un poids valide, en kilos.", "error")
        else:
            db.execute("INSERT INTO bodyweight (day, kg) VALUES (?, ?)",
                       (parse_day(request.form.get("day")).isoformat(), kg))
            db.commit()
            flash("Poids enregistré.")
        return redirect(url_for("weight"))

    rows = db.execute("SELECT * FROM bodyweight ORDER BY day DESC, id DESC").fetchall()
    entries = []
    for i, r in enumerate(rows):
        older = rows[i + 1]["kg"] if i + 1 < len(rows) else None
        entries.append({"id": r["id"], "day": r["day"], "kg": r["kg"],
                        "diff": None if older is None else r["kg"] - older})
    chart = None
    if len(rows) >= 2:
        chart = {"type": "line", "unit": "kg", "points": [
            {"label": jour_court_filter(r["day"]), "date": r["day"], "value": r["kg"]} for r in reversed(rows)]}
    return render_template("weight.html", nav="poids", entries=entries, chart=chart, today=date.today().isoformat())


@app.post("/poids/<int:entry_id>/supprimer")
def delete_weight(entry_id):
    db = get_db()
    db.execute("DELETE FROM bodyweight WHERE id = ?", (entry_id,))
    db.commit()
    flash("Pesée supprimée.")
    return redirect(url_for("weight"))


init_db()

if __name__ == "__main__":
    app.run(debug=True)
