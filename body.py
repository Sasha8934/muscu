"""Schéma du corps humain (homme / femme, face / dos).

Les formes viennent de react-native-body-highlighter (licence MIT,
© 2022 ELABBASSI Hicham, https://github.com/HichamELBSI/react-native-body-highlighter),
converties en JSON dans body_shapes.json. Chaque forme porte la clé du muscle
de Muscu (« m »), ou rien pour les parties décoratives (tête, mains, cheveux…).
"""
import json
from pathlib import Path

SHAPES = json.loads((Path(__file__).parent / "body_shapes.json").read_text(encoding="utf-8"))
SEXES = [("homme", "Homme"), ("femme", "Femme")]
VIEWS = [("face", "Face"), ("dos", "Dos")]

# Petit schéma d'un exercice : la vue où le muscle principal se voit le mieux, zoomée sur le haut ou le bas du corps.
MINI = {
    "pectoraux": ("face", "haut"), "epaules": ("face", "haut"), "biceps": ("face", "haut"),
    "avant_bras": ("face", "haut"), "abdominaux": ("face", "haut"),
    "dos": ("dos", "haut"), "trapezes": ("dos", "haut"), "triceps": ("dos", "haut"), "lombaires": ("dos", "haut"),
    "quadriceps": ("face", "bas"), "adducteurs": ("face", "bas"),
    "fessiers": ("dos", "bas"), "ischios": ("dos", "bas"), "mollets": ("dos", "bas"),
}
# Partie du dessin gardée pour chaque zoom : (gauche, droite, haut, bas), en fraction de la largeur / hauteur
ZONES = {"haut": (0.08, 0.92, 0.13, 0.50), "bas": (0.22, 0.78, 0.40, 0.97)}


def mini_box(sex, primary):
    """Vue et cadrage (viewBox) du petit schéma pour un muscle principal."""
    view, zone = MINI.get(primary, ("face", "haut"))
    x, y, w, h = (float(v) for v in SHAPES[sex][view]["box"].split())
    left, right, top, bottom = ZONES[zone]
    return view, f"{x + w * left:g} {y + h * top:g} {w * (right - left):g} {h * (bottom - top):g}"
