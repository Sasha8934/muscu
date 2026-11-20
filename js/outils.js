// Outils communs : HTML sûr, dates, kilos, tri sans accents.

// ---------- HTML ----------
// html`...` échappe tout ce qu'on insère, sauf ce qui est déjà du HTML (raw(...) ou un autre html`...`).
class Safe {
  constructor(text) { this.text = text; }
  toString() { return this.text; }
}
export const raw = (text) => new Safe(String(text));

export function esc(value) {
  if (value === null || value === undefined || value === false) return "";
  if (value instanceof Safe) return value.text;
  if (Array.isArray(value)) return value.map(esc).join("");
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((v, i) => { out += esc(v) + strings[i + 1]; });
  return new Safe(out);
}

// ---------- Dates (toujours en heure locale, format AAAA-MM-JJ) ----------
export const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre",
  "octobre", "novembre", "décembre"];
export const MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.",
  "nov.", "déc."];
export const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export function iso(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function parseIso(text) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text || "");
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return isNaN(d) ? null : d;
}
export const today = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
export const todayIso = () => iso(today());
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const weekday = (d) => (d.getDay() + 6) % 7; // lundi = 0
export const weekStart = (d) => addDays(d, -weekday(d));
export const toDate = (v) => (v instanceof Date ? v : parseIso(v));
export const parseDayOr = (text, fallback = today()) => parseIso(text) || fallback;

export function jour(v) {
  const d = toDate(v);
  return `${JOURS[weekday(d)]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
}
export function jourCourt(v) {
  const d = toDate(v);
  return `${d.getDate()} ${MOIS_COURTS[d.getMonth()]}`;
}

// ---------- Kilos ----------
export function kg(value) {
  if (value === null || value === undefined || value === "") return "–";
  const v = Math.round(Number(value) * 100) / 100;
  const text = Number.isInteger(v)
    ? v.toLocaleString("fr-FR", { maximumFractionDigits: 0 })
    : v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return text.replace(/ | /g, " ");
}
export const kgIn = (value) => (value ? kg(value).replace(/ /g, "") : "");
export function charge(weight, isBodyweight = false) {
  if (isBodyweight) return weight ? `PDC + ${kg(weight)} kg` : "PDC";
  return `${kg(weight)} kg`;
}
// « 62,5 » ou « 62.5 » -> 62.5 ; vide -> valeur par défaut ; sinon NaN
export function parseKg(text, fallback = NaN) {
  const t = String(text ?? "").trim().replace(",", ".");
  if (!t) return fallback;
  return /^\d+(\.\d+)?$/.test(t) ? parseFloat(t) : NaN;
}
export function formatSet(reps, weight, isBodyweight) {
  if (isBodyweight) return `${reps}` + (weight ? ` (+${kg(weight)})` : "");
  return `${reps}×${kg(weight)}`;
}

// Nom très court pour le calendrier : « Quadriceps / Fessiers » -> « Quadri »
export function court(name) {
  const word = (name || "").split("/")[0].trim().split(/\s+/)[0] || "";
  const known = { quadriceps: "Quadri", quadri: "Quadri", pectoraux: "Pecs", abdominaux: "Abdos", ischios: "Ischios",
    "ischio-jambiers": "Ischios", "trapèzes": "Trapèz.", adducteurs: "Adduct." };
  return known[word.toLowerCase()] || (word.length <= 6 ? word : word.slice(0, 5) + ".");
}

// ---------- Divers ----------
export const sortKey = (text) => String(text).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
export const byName = (a, b) => sortKey(a.name).localeCompare(sortKey(b.name));
export const plural = (n, word, many = word + "s") => `${n} ${n > 1 ? many : word}`;
export const sum = (list, f = (x) => x) => list.reduce((t, x) => t + f(x), 0);
