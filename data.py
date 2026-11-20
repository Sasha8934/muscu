"""Données de départ : groupes musculaires, exercices et programme."""

# (clé, nom affiché)
MUSCLES = [
    ("pectoraux", "Pectoraux"),
    ("dos", "Dos"),
    ("trapezes", "Trapèzes"),
    ("epaules", "Épaules"),
    ("biceps", "Biceps"),
    ("triceps", "Triceps"),
    ("avant_bras", "Avant-bras"),
    ("abdominaux", "Abdominaux"),
    ("lombaires", "Lombaires"),
    ("quadriceps", "Quadriceps"),
    ("ischios", "Ischio-jambiers"),
    ("fessiers", "Fessiers"),
    ("adducteurs", "Adducteurs"),
    ("mollets", "Mollets"),
]
MUSCLE_NAMES = dict(MUSCLES)

EQUIPMENTS = ["Barre", "Haltères", "Machine", "Poulie", "Poids du corps", "Kettlebell", "Autre"]

DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]

# (nom, muscle principal, [muscles secondaires], matériel, poids du corps ?, conseil)
EXERCISES = [
    # Pectoraux
    ("Développé couché barre", "pectoraux", ["triceps", "epaules"], "Barre", False,
     "Omoplates serrées, pieds au sol, descendre la barre au bas des pectoraux."),
    ("Développé couché haltères", "pectoraux", ["triceps", "epaules"], "Haltères", False,
     "Plus grande amplitude qu'à la barre ; contrôler la descente."),
    ("Développé incliné barre", "pectoraux", ["epaules", "triceps"], "Barre", False,
     "Banc à 30-45°, cible le haut des pectoraux."),
    ("Développé incliné haltères", "pectoraux", ["epaules", "triceps"], "Haltères", False,
     "Banc à 30-45°, coudes légèrement rentrés."),
    ("Développé décliné", "pectoraux", ["triceps"], "Barre", False,
     "Cible le bas des pectoraux."),
    ("Développé machine convergente", "pectoraux", ["triceps", "epaules"], "Machine", False,
     "Trajectoire guidée, idéal pour finir une séance."),
    ("Écarté haltères", "pectoraux", ["epaules"], "Haltères", False,
     "Bras légèrement fléchis, ouvrir jusqu'à sentir l'étirement."),
    ("Écarté poulie vis-à-vis", "pectoraux", ["epaules"], "Poulie", False,
     "Tension continue ; rapprocher les mains devant soi."),
    ("Pec deck", "pectoraux", [], "Machine", False,
     "Garder les épaules basses et serrer en fin de mouvement."),
    ("Pompes", "pectoraux", ["triceps", "epaules", "abdominaux"], "Poids du corps", True,
     "Corps gainé, poitrine jusqu'au sol."),
    ("Dips buste penché", "pectoraux", ["triceps", "epaules"], "Poids du corps", True,
     "Pencher le buste en avant pour cibler les pectoraux."),

    # Dos
    ("Tractions pronation", "dos", ["biceps", "avant_bras"], "Poids du corps", True,
     "Paumes vers l'avant, monter le menton au-dessus de la barre."),
    ("Tractions supination", "dos", ["biceps"], "Poids du corps", True,
     "Paumes vers soi, sollicite davantage les biceps."),
    ("Tirage vertical poulie", "dos", ["biceps"], "Poulie", False,
     "Tirer la barre vers le haut de la poitrine, buste légèrement incliné."),
    ("Tirage horizontal poulie", "dos", ["biceps", "trapezes"], "Poulie", False,
     "Dos droit, ramener les coudes vers l'arrière."),
    ("Rowing barre", "dos", ["biceps", "lombaires", "trapezes"], "Barre", False,
     "Buste penché, dos plat, tirer la barre vers le nombril."),
    ("Rowing haltère un bras", "dos", ["biceps"], "Haltères", False,
     "Un genou sur le banc, tirer le coude vers la hanche."),
    ("Rowing T-bar", "dos", ["biceps", "trapezes"], "Barre", False,
     "Dos plat, poitrine sortie."),
    ("Pull-over poulie", "dos", ["triceps"], "Poulie", False,
     "Bras presque tendus, descendre la barre jusqu'aux cuisses."),
    ("Soulevé de terre", "dos", ["ischios", "fessiers", "lombaires", "trapezes", "avant_bras"], "Barre", False,
     "Dos plat, pousser dans le sol, barre près des jambes."),

    # Trapèzes
    ("Shrugs haltères", "trapezes", ["avant_bras"], "Haltères", False,
     "Hausser les épaules vers les oreilles, sans rouler."),
    ("Shrugs barre", "trapezes", ["avant_bras"], "Barre", False,
     "Bras tendus, monter et descendre les épaules."),

    # Épaules
    ("Développé militaire barre", "epaules", ["triceps", "trapezes"], "Barre", False,
     "Debout, gainé, pousser la barre au-dessus de la tête."),
    ("Développé haltères assis", "epaules", ["triceps"], "Haltères", False,
     "Dos calé contre le dossier, ne pas cambrer."),
    ("Arnold press", "epaules", ["triceps"], "Haltères", False,
     "Rotation des poignets pendant la montée."),
    ("Élévations latérales", "epaules", ["trapezes"], "Haltères", False,
     "Monter les coudes jusqu'à l'horizontale, sans élan."),
    ("Élévations frontales", "epaules", [], "Haltères", False,
     "Monter devant soi jusqu'à hauteur des yeux."),
    ("Oiseau", "epaules", ["trapezes", "dos"], "Haltères", False,
     "Buste penché, ouvrir les bras : cible l'arrière des épaules."),
    ("Face pull", "epaules", ["trapezes"], "Poulie", False,
     "Corde à hauteur du visage, tirer en écartant les mains."),
    ("Rowing menton", "epaules", ["trapezes", "biceps"], "Barre", False,
     "Monter les coudes, sans dépasser la hauteur des épaules."),

    # Biceps
    ("Curl barre", "biceps", ["avant_bras"], "Barre", False,
     "Coudes fixes le long du corps."),
    ("Curl haltères", "biceps", ["avant_bras"], "Haltères", False,
     "Tourner les poignets (supination) en montant."),
    ("Curl marteau", "biceps", ["avant_bras"], "Haltères", False,
     "Prise neutre (pouces vers le haut)."),
    ("Curl incliné", "biceps", [], "Haltères", False,
     "Banc incliné, bras en arrière : grand étirement."),
    ("Curl pupitre", "biceps", [], "Barre", False,
     "Bras posés sur le pupitre, ne pas tendre complètement en bas."),
    ("Curl poulie", "biceps", ["avant_bras"], "Poulie", False,
     "Tension continue sur tout le mouvement."),

    # Triceps
    ("Extension poulie haute", "triceps", [], "Poulie", False,
     "Coudes collés au corps, tendre les bras vers le bas."),
    ("Barre au front", "triceps", [], "Barre", False,
     "Allongé, descendre la barre vers le front en gardant les coudes fixes."),
    ("Extension nuque haltère", "triceps", [], "Haltères", False,
     "Haltère derrière la tête, coudes pointés vers le haut."),
    ("Dips", "triceps", ["pectoraux", "epaules"], "Poids du corps", True,
     "Buste droit pour cibler les triceps."),
    ("Développé couché prise serrée", "triceps", ["pectoraux", "epaules"], "Barre", False,
     "Mains à largeur d'épaules, coudes près du corps."),
    ("Kickback", "triceps", [], "Haltères", False,
     "Buste penché, tendre le bras vers l'arrière."),

    # Avant-bras
    ("Curl poignets", "avant_bras", [], "Barre", False,
     "Avant-bras posés, seuls les poignets bougent."),
    ("Curl inversé", "avant_bras", ["biceps"], "Barre", False,
     "Prise en pronation (paumes vers le bas)."),

    # Abdominaux
    ("Crunch", "abdominaux", [], "Poids du corps", True,
     "Enrouler le haut du dos, sans tirer sur la nuque."),
    ("Crunch poulie", "abdominaux", [], "Poulie", False,
     "À genoux, enrouler le buste vers le sol."),
    ("Relevés de jambes suspendu", "abdominaux", ["avant_bras"], "Poids du corps", True,
     "Suspendu à une barre, monter les jambes sans balancer."),
    ("Roue abdominale", "abdominaux", ["dos", "epaules"], "Poids du corps", True,
     "Dérouler en gardant le dos plat."),
    ("Russian twist", "abdominaux", [], "Poids du corps", True,
     "Assis, pieds levés, tourner le buste de chaque côté."),

    # Lombaires
    ("Extensions lombaires", "lombaires", ["fessiers", "ischios"], "Poids du corps", True,
     "Sur banc à 45°, remonter jusqu'à l'alignement du corps."),
    ("Good morning", "lombaires", ["ischios", "fessiers"], "Barre", False,
     "Barre sur les épaules, pencher le buste dos plat."),

    # Quadriceps
    ("Squat barre", "quadriceps", ["fessiers", "ischios", "lombaires"], "Barre", False,
     "Descendre au moins cuisses parallèles, genoux dans l'axe des pieds."),
    ("Front squat", "quadriceps", ["fessiers", "abdominaux"], "Barre", False,
     "Barre devant, buste très droit."),
    ("Goblet squat", "quadriceps", ["fessiers"], "Kettlebell", False,
     "Charge tenue contre la poitrine."),
    ("Presse à cuisses", "quadriceps", ["fessiers", "ischios"], "Machine", False,
     "Ne pas décoller le bas du dos du dossier."),
    ("Hack squat", "quadriceps", ["fessiers"], "Machine", False,
     "Pieds bas sur la plateforme pour cibler les quadriceps."),
    ("Leg extension", "quadriceps", [], "Machine", False,
     "Tendre complètement et marquer un temps en haut."),
    ("Fentes haltères", "quadriceps", ["fessiers", "ischios"], "Haltères", False,
     "Grand pas, genou arrière proche du sol."),
    ("Fentes bulgares", "quadriceps", ["fessiers"], "Haltères", False,
     "Pied arrière posé sur un banc."),

    # Ischio-jambiers
    ("Soulevé de terre roumain", "ischios", ["fessiers", "lombaires"], "Barre", False,
     "Jambes presque tendues, pousser les fesses vers l'arrière."),
    ("Leg curl allongé", "ischios", ["mollets"], "Machine", False,
     "Hanches collées au banc."),
    ("Leg curl assis", "ischios", [], "Machine", False,
     "Contrôler la remontée."),
    ("Nordic curl", "ischios", [], "Poids du corps", True,
     "À genoux, chevilles bloquées, descendre le plus lentement possible."),

    # Fessiers
    ("Hip thrust barre", "fessiers", ["ischios"], "Barre", False,
     "Haut du dos sur un banc, pousser les hanches vers le haut et serrer."),
    ("Pont fessier", "fessiers", ["ischios"], "Poids du corps", True,
     "Allongé au sol, monter le bassin."),
    ("Kickback poulie", "fessiers", ["ischios"], "Poulie", False,
     "Tendre la jambe vers l'arrière sans cambrer."),
    ("Abducteurs machine", "fessiers", [], "Machine", False,
     "Écarter les jambes, cible le moyen fessier."),
    ("Step-up", "fessiers", ["quadriceps"], "Haltères", False,
     "Monter sur un banc en poussant sur le talon."),
    ("Soulevé de terre sumo", "fessiers", ["quadriceps", "adducteurs", "dos"], "Barre", False,
     "Pieds très écartés, mains entre les jambes."),

    # Adducteurs
    ("Adducteurs machine", "adducteurs", [], "Machine", False,
     "Rapprocher les jambes en contrôlant le retour."),

    # Mollets
    ("Mollets debout machine", "mollets", [], "Machine", False,
     "Monter le plus haut possible, descendre talons bas."),
    ("Mollets assis", "mollets", [], "Machine", False,
     "Cible le soléaire (partie profonde du mollet)."),
    ("Mollets à la presse", "mollets", [], "Machine", False,
     "Pousser avec la pointe des pieds, jambes tendues."),
]

# (nom, jour, [muscles])
TEMPLATES = [
    ("Quadriceps / Fessiers", "Lundi", ["quadriceps", "fessiers"]),
    ("Pecs / Biceps / Épaules", "Mercredi", ["pectoraux", "biceps", "epaules"]),
    ("Ischios / Fessiers", "Vendredi", ["ischios", "fessiers"]),
    ("Dos / Triceps / Abdos", "Dimanche", ["dos", "triceps", "abdominaux"]),
]
