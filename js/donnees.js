// Données de départ : muscles, matériel, jours, exercices (avec photos) et programme.
// Les photos viennent de Free Exercise DB (domaine public) : img/exos/<image>/0.jpg (départ), 1.jpg (arrivée), mini.jpg.

export const MUSCLES = [
  [
    "pectoraux",
    "Pectoraux"
  ],
  [
    "dos",
    "Dos"
  ],
  [
    "trapezes",
    "Trapèzes"
  ],
  [
    "epaules",
    "Épaules"
  ],
  [
    "biceps",
    "Biceps"
  ],
  [
    "triceps",
    "Triceps"
  ],
  [
    "avant_bras",
    "Avant-bras"
  ],
  [
    "abdominaux",
    "Abdominaux"
  ],
  [
    "lombaires",
    "Lombaires"
  ],
  [
    "quadriceps",
    "Quadriceps"
  ],
  [
    "ischios",
    "Ischio-jambiers"
  ],
  [
    "fessiers",
    "Fessiers"
  ],
  [
    "adducteurs",
    "Adducteurs"
  ],
  [
    "mollets",
    "Mollets"
  ]
];
export const MUSCLE_NAMES = Object.fromEntries(MUSCLES);

export const EQUIPMENTS = [
  "Barre",
  "Haltères",
  "Machine",
  "Poulie",
  "Poids du corps",
  "Kettlebell",
  "Autre"
];

export const DAYS = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche"
];

// Photo de la carte « Séance du jour », selon le premier groupe musculaire
export const COVERS = {
  "pectoraux": "Barbell_Bench_Press_-_Medium_Grip",
  "dos": "Pullups",
  "trapezes": "Barbell_Shrug",
  "epaules": "Standing_Military_Press",
  "biceps": "Barbell_Curl",
  "triceps": "Dips_-_Triceps_Version",
  "avant_bras": "Reverse_Barbell_Curl",
  "abdominaux": "Hanging_Leg_Raise",
  "lombaires": "Good_Morning",
  "quadriceps": "Barbell_Full_Squat",
  "ischios": "Romanian_Deadlift",
  "fessiers": "Barbell_Hip_Thrust",
  "adducteurs": "Sumo_Deadlift",
  "mollets": "Standing_Calf_Raises"
};

export const EXERCICES_DEPART = [
  {
    "name": "Développé couché barre",
    "primary": "pectoraux",
    "secondary": [
      "triceps",
      "epaules"
    ],
    "equipment": "Barre",
    "bodyweight": false,
    "tips": "Omoplates serrées, pieds au sol, descendre la barre au bas des pectoraux.",
    "image": "Barbell_Bench_Press_-_Medium_Grip"
  },
  {
    "name": "Développé couché haltères",
    "primary": "pectoraux",
    "secondary": [
      "triceps",
      "epaules"
    ],
    "equipment": "Haltères",
    "bodyweight": false,
    "tips": "Plus grande amplitude qu'à la barre ; contrôler la descente.",
    "image": "Dumbbell_Bench_Press"
  },
  {
    "name": "Développé incliné barre",
    "primary": "pectoraux",
    "secondary": [
      "epaules",
      "triceps"
    ],
    "equipment": "Barre",
    "bodyweight": false,
    "tips": "Banc à 30-45°, cible le haut des pectoraux.",
    "image": "Barbell_Incline_Bench_Press_-_Medium_Grip"
  },
  {
    "name": "Développé incliné haltères",
    "primary": "pectoraux",
    "secondary": [
      "epaules",
      "triceps"
    ],
    "equipment": "Haltères",
    "bodyweight": false,
    "tips": "Banc à 30-45°, coudes légèrement rentrés.",
    "image": "Incline_Dumbbell_Press"
  },
  {
    "name": "Développé décliné",
    "primary": "pectoraux",
    "secondary": [
      "triceps"
    ],
    "equipment": "Barre",
    "bodyweight": false,
    "tips": "Cible le bas des pectoraux.",
    "image": "Decline_Barbell_Bench_Press"
  },
  {
    "name": "Développé machine convergente",
    "primary": "pectoraux",
    "secondary": [
      "triceps",
      "epaules"
    ],
    "equipment": "Machine",
    "bodyweight": false,
    "tips": "Trajectoire guidée, idéal pour finir une séance.",
    "image": "Leverage_Chest_Press"
  },
  {
    "name": "Écarté haltères",
    "primary": "pectoraux",
    "secondary": [
      "epaules"
    ],
    "equipment": "Haltères",
    "bodyweight": false,
    "tips": "Bras légèrement fléchis, ouvrir jusqu'à sentir l'étirement.",
    "image": "Dumbbell_Flyes"
  },
  {
    "name": "Écarté poulie vis-à-vis",
    "primary": "pectoraux",
    "secondary": [
      "epaules"
    ],
    "equipment": "Poulie",
    "bodyweight": false,
    "tips": "Tension continue ; rapprocher les mains devant soi.",
    "image": "Cable_Crossover"
  },
  {
    "name": "Pec deck",
    "primary": "pectoraux",
    "secondary": [],
    "equipment": "Machine",
    "bodyweight": false,
    "tips": "Garder les épaules basses et serrer en fin de mouvement.",
    "image": "Butterfly"
  },
  {
    "name": "Pompes",
    "primary": "pectoraux",
    "secondary": [
      "triceps",
      "epaules",
      "abdominaux"
    ],
    "equipment": "Poids du corps",
    "bodyweight": true,
    "tips": "Corps gainé, poitrine jusqu'au sol.",
    "image": "Pushups"
  },
  {
    "name": "Dips buste penché",
    "primary": "pectoraux",
    "secondary": [
      "triceps",
      "epaules"
    ],
    "equipment": "Poids du corps",
    "bodyweight": true,
    "tips": "Pencher le buste en avant pour cibler les pectoraux.",
    "image": "Dips_-_Chest_Version"
  },
  {
    "name": "Tractions pronation",
    "primary": "dos",
    "secondary": [
      "biceps",
      "avant_bras"
    ],
    "equipment": "Poids du corps",
    "bodyweight": true,
    "tips": "Paumes vers l'avant, monter le menton au-dessus de la barre.",
    "image": "Pullups"
  },
  {
    "name": "Tractions supination",
    "primary": "dos",
    "secondary": [
      "biceps"
    ],
    "equipment": "Poids du corps",
    "bodyweight": true,
    "tips": "Paumes vers soi, sollicite davantage les biceps.",
    "image": "Chin-Up"
  },
  {
    "name": "Tirage vertical poulie",
    "primary": "dos",
    "secondary": [
      "biceps"
    ],
    "equipment": "Poulie",
    "bodyweight": false,
    "tips": "Tirer la barre vers le haut de la poitrine, buste légèrement incliné.",
    "image": "Wide-Grip_Lat_Pulldown"
  },
  {
    "name": "Tirage horizontal poulie",
    "primary": "dos",
    "secondary": [
      "biceps",
      "trapezes"
    ],
    "equipment": "Poulie",
    "bodyweight": false,
    "tips": "Dos droit, ramener les coudes vers l'arrière.",
    "image": "Seated_Cable_Rows"
  },
  {
    "name": "Rowing barre",
    "primary": "dos",
    "secondary": [
      "biceps",
      "lombaires",
      "trapezes"
    ],
    "equipment": "Barre",
    "bodyweight": false,
    "tips": "Buste penché, dos plat, tirer la barre vers le nombril.",
    "image": "Bent_Over_Barbell_Row"
  },
  {
    "name": "Rowing haltère un bras",
    "primary": "dos",
    "secondary": [
      "biceps"
    ],
    "equipment": "Haltères",
    "bodyweight": false,
    "tips": "Un genou sur le banc, tirer le coude vers la hanche.",
    "image": "One-Arm_Dumbbell_Row"
  },
  {
    "name": "Rowing T-bar",
    "primary": "dos",
    "secondary": [
      "biceps",
      "trapezes"
    ],
    "equipment": "Barre",
    "bodyweight": false,
    "tips": "Dos plat, poitrine sortie.",
    "image": "T-Bar_Row_with_Handle"
  },
  {
    "name": "Pull-over poulie",
    "primary": "dos",
    "secondary": [
      "triceps"
    ],
    "equipment": "Poulie",
    "bodyweight": false,
    "tips": "Bras presque tendus, descendre la barre jusqu'aux cuisses.",
    "image": "Straight-Arm_Pulldown"
  },
  {
    "name": "Soulevé de terre",
    "primary": "dos",
    "secondary": [
      "ischios",
      "fessiers",
      "lombaires",
      "trapezes",
      "avant_bras"
    ],
    "equipment": "Barre",
    "bodyweight": false,
    "tips": "Dos plat, pousser dans le sol, barre près des jambes.",
    "image": "Barbell_Deadlift"
  },
  {
    "name": "Shrugs haltères",
    "primary": "trapezes",
    "secondary": [
      "avant_bras"
    ],
    "equipment": "Haltères",
    "bodyweight": false,
    "tips": "Hausser les épaules vers les oreilles, sans rouler.",
    "image": "Dumbbell_Shrug"
  },
  {
    "name": "Shrugs barre",
    "primary": "trapezes",
    "secondary": [
      "avant_bras"
    ],
    "equipment": "Barre",
    "bodyweight": false,
    "tips": "Bras tendus, monter et descendre les épaules.",
    "image": "Barbell_Shrug"
  },
  {
    "name": "Développé militaire barre",
    "primary": "epaules",
    "secondary": [
      "triceps",
      "trapezes"
    ],
    "equipment": "Barre",
    "bodyweight": false,
    "tips": "Debout, gainé, pousser la barre au-dessus de la tête.",
    "image": "Standing_Military_Press"
  },
  {
    "name": "Développé haltères assis",
    "primary": "epaules",
    "secondary": [
      "triceps"
    ],
    "equipment": "Haltères",
    "bodyweight": false,
    "tips": "Dos calé contre le dossier, ne pas cambrer.",
    "image": "Seated_Dumbbell_Press"
  },
  {
    "name": "Arnold press",
    "primary": "epaules",
    "secondary": [
      "triceps"
    ],
    "equipment": "Haltères",
    "bodyweight": false,
    "tips": "Rotation des poignets pendant la montée.",
    "image": "Arnold_Dumbbell_Press"
  },
  {
    "name": "Élévations latérales",
    "primary": "epaules",
    "secondary": [
      "trapezes"
    ],
    "equipment": "Haltères",
    "bodyweight": false,
    "tips": "Monter les coudes jusqu'à l'horizontale, sans élan.",
    "image": "Side_Lateral_Raise"
  },
  {
    "name": "Élévations frontales",
    "primary": "epaules",
    "secondary": [],
    "equipment": "Haltères",
    "bodyweight": false,
    "tips": "Monter devant soi jusqu'à hauteur des yeux.",
    "image": "Front_Dumbbell_Raise"
  },
  {
    "name": "Oiseau",
    "primary": "epaules",
    "secondary": [
      "trapezes",
      "dos"
    ],
    "equipment": "Haltères",
    "bodyweight": false,
    "tips": "Buste penché, ouvrir les bras : cible l'arrière des épaules.",
    "image": "Seated_Bent-Over_Rear_Delt_Raise"
  },
  {
    "name": "Face pull",
    "primary": "epaules",
    "secondary": [
      "trapezes"
    ],
    "equipment": "Poulie",
    "bodyweight": false,
    "tips": "Corde à hauteur du visage, tirer en écartant les mains.",
    "image": "Face_Pull"
  },
  {
    "name": "Rowing menton",
    "primary": "epaules",
    "secondary": [
      "trapezes",
      "biceps"
    ],
    "equipment": "Barre",
    "bodyweight": false,
    "tips": "Monter les coudes, sans dépasser la hauteur des épaules.",
    "image": "Upright_Barbell_Row"
  },
  {
    "name": "Curl barre",
    "primary": "biceps",
    "secondary": [
      "avant_bras"
    ],
    "equipment": "Barre",
    "bodyweight": false,
    "tips": "Coudes fixes le long du corps.",
    "image": "Barbell_Curl"
  },
  {
    "name": "Curl haltères",
    "primary": "biceps",
    "secondary": [
      "avant_bras"
    ],
    "equipment": "Haltères",
    "bodyweight": false,
    "tips": "Tourner les poignets (supination) en montant.",
    "image": "Dumbbell_Bicep_Curl"
  },
  {
    "name": "Curl marteau",
    "primary": "biceps",
    "secondary": [
      "avant_bras"
    ],
    "equipment": "Haltères",
    "bodyweight": false,
    "tips": "Prise neutre (pouces vers le haut).",
    "image": "Hammer_Curls"
  },
  {
    "name": "Curl incliné",
    "primary": "biceps",
    "secondary": [],
    "equipment": "Haltères",
    "bodyweight": false,
    "tips": "Banc incliné, bras en arrière : grand étirement.",
    "image": "Incline_Dumbbell_Curl"
  },
  {
    "name": "Curl pupitre",
    "primary": "biceps",
    "secondary": [],
    "equipment": "Barre",
    "bodyweight": false,
    "tips": "Bras posés sur le pupitre, ne pas tendre complètement en bas.",
    "image": "Preacher_Curl"
  },
  {
    "name": "Curl poulie",
    "primary": "biceps",
    "secondary": [
      "avant_bras"
    ],
    "equipment": "Poulie",
    "bodyweight": false,
    "tips": "Tension continue sur tout le mouvement.",
    "image": "Standing_Biceps_Cable_Curl"
  },
  {
    "name": "Extension poulie haute",
    "primary": "triceps",
    "secondary": [],
    "equipment": "Poulie",
    "bodyweight": false,
    "tips": "Coudes collés au corps, tendre les bras vers le bas.",
    "image": "Triceps_Pushdown"
  },
  {
    "name": "Barre au front",
    "primary": "triceps",
    "secondary": [],
    "equipment": "Barre",
    "bodyweight": false,
    "tips": "Allongé, descendre la barre vers le front en gardant les coudes fixes.",
    "image": "EZ-Bar_Skullcrusher"
  },
  {
    "name": "Extension nuque haltère",
    "primary": "triceps",
    "secondary": [],
    "equipment": "Haltères",
    "bodyweight": false,
    "tips": "Haltère derrière la tête, coudes pointés vers le haut.",
    "image": "Standing_Dumbbell_Triceps_Extension"
  },
  {
    "name": "Dips",
    "primary": "triceps",
    "secondary": [
      "pectoraux",
      "epaules"
    ],
    "equipment": "Poids du corps",
    "bodyweight": true,
    "tips": "Buste droit pour cibler les triceps.",
    "image": "Dips_-_Triceps_Version"
  },
  {
    "name": "Développé couché prise serrée",
    "primary": "triceps",
    "secondary": [
      "pectoraux",
      "epaules"
    ],
    "equipment": "Barre",
    "bodyweight": false,
    "tips": "Mains à largeur d'épaules, coudes près du corps.",
    "image": "Close-Grip_Barbell_Bench_Press"
  },
  {
    "name": "Kickback",
    "primary": "triceps",
    "secondary": [],
    "equipment": "Haltères",
    "bodyweight": false,
    "tips": "Buste penché, tendre le bras vers l'arrière.",
    "image": "Tricep_Dumbbell_Kickback"
  },
  {
    "name": "Curl poignets",
    "primary": "avant_bras",
    "secondary": [],
    "equipment": "Barre",
    "bodyweight": false,
    "tips": "Avant-bras posés, seuls les poignets bougent.",
    "image": "Palms-Up_Barbell_Wrist_Curl_Over_A_Bench"
  },
  {
    "name": "Curl inversé",
    "primary": "avant_bras",
    "secondary": [
      "biceps"
    ],
    "equipment": "Barre",
    "bodyweight": false,
    "tips": "Prise en pronation (paumes vers le bas).",
    "image": "Reverse_Barbell_Curl"
  },
  {
    "name": "Crunch",
    "primary": "abdominaux",
    "secondary": [],
    "equipment": "Poids du corps",
    "bodyweight": true,
    "tips": "Enrouler le haut du dos, sans tirer sur la nuque.",
    "image": "Crunches"
  },
  {
    "name": "Crunch poulie",
    "primary": "abdominaux",
    "secondary": [],
    "equipment": "Poulie",
    "bodyweight": false,
    "tips": "À genoux, enrouler le buste vers le sol.",
    "image": "Cable_Crunch"
  },
  {
    "name": "Relevés de jambes suspendu",
    "primary": "abdominaux",
    "secondary": [
      "avant_bras"
    ],
    "equipment": "Poids du corps",
    "bodyweight": true,
    "tips": "Suspendu à une barre, monter les jambes sans balancer.",
    "image": "Hanging_Leg_Raise"
  },
  {
    "name": "Roue abdominale",
    "primary": "abdominaux",
    "secondary": [
      "dos",
      "epaules"
    ],
    "equipment": "Poids du corps",
    "bodyweight": true,
    "tips": "Dérouler en gardant le dos plat.",
    "image": "Ab_Roller"
  },
  {
    "name": "Russian twist",
    "primary": "abdominaux",
    "secondary": [],
    "equipment": "Poids du corps",
    "bodyweight": true,
    "tips": "Assis, pieds levés, tourner le buste de chaque côté.",
    "image": "Russian_Twist"
  },
  {
    "name": "Extensions lombaires",
    "primary": "lombaires",
    "secondary": [
      "fessiers",
      "ischios"
    ],
    "equipment": "Poids du corps",
    "bodyweight": true,
    "tips": "Sur banc à 45°, remonter jusqu'à l'alignement du corps.",
    "image": "Hyperextensions_Back_Extensions"
  },
  {
    "name": "Good morning",
    "primary": "lombaires",
    "secondary": [
      "ischios",
      "fessiers"
    ],
    "equipment": "Barre",
    "bodyweight": false,
    "tips": "Barre sur les épaules, pencher le buste dos plat.",
    "image": "Good_Morning"
  },
  {
    "name": "Squat barre",
    "primary": "quadriceps",
    "secondary": [
      "fessiers",
      "ischios",
      "lombaires"
    ],
    "equipment": "Barre",
    "bodyweight": false,
    "tips": "Descendre au moins cuisses parallèles, genoux dans l'axe des pieds.",
    "image": "Barbell_Full_Squat"
  },
  {
    "name": "Front squat",
    "primary": "quadriceps",
    "secondary": [
      "fessiers",
      "abdominaux"
    ],
    "equipment": "Barre",
    "bodyweight": false,
    "tips": "Barre devant, buste très droit.",
    "image": "Front_Barbell_Squat"
  },
  {
    "name": "Goblet squat",
    "primary": "quadriceps",
    "secondary": [
      "fessiers"
    ],
    "equipment": "Kettlebell",
    "bodyweight": false,
    "tips": "Charge tenue contre la poitrine.",
    "image": "Goblet_Squat"
  },
  {
    "name": "Presse à cuisses",
    "primary": "quadriceps",
    "secondary": [
      "fessiers",
      "ischios"
    ],
    "equipment": "Machine",
    "bodyweight": false,
    "tips": "Ne pas décoller le bas du dos du dossier.",
    "image": "Leg_Press"
  },
  {
    "name": "Hack squat",
    "primary": "quadriceps",
    "secondary": [
      "fessiers"
    ],
    "equipment": "Machine",
    "bodyweight": false,
    "tips": "Pieds bas sur la plateforme pour cibler les quadriceps.",
    "image": "Hack_Squat"
  },
  {
    "name": "Leg extension",
    "primary": "quadriceps",
    "secondary": [],
    "equipment": "Machine",
    "bodyweight": false,
    "tips": "Tendre complètement et marquer un temps en haut.",
    "image": "Leg_Extensions"
  },
  {
    "name": "Fentes haltères",
    "primary": "quadriceps",
    "secondary": [
      "fessiers",
      "ischios"
    ],
    "equipment": "Haltères",
    "bodyweight": false,
    "tips": "Grand pas, genou arrière proche du sol.",
    "image": "Dumbbell_Lunges"
  },
  {
    "name": "Fentes bulgares",
    "primary": "quadriceps",
    "secondary": [
      "fessiers"
    ],
    "equipment": "Haltères",
    "bodyweight": false,
    "tips": "Pied arrière posé sur un banc.",
    "image": "Split_Squat_with_Dumbbells"
  },
  {
    "name": "Soulevé de terre roumain",
    "primary": "ischios",
    "secondary": [
      "fessiers",
      "lombaires"
    ],
    "equipment": "Barre",
    "bodyweight": false,
    "tips": "Jambes presque tendues, pousser les fesses vers l'arrière.",
    "image": "Romanian_Deadlift"
  },
  {
    "name": "Leg curl allongé",
    "primary": "ischios",
    "secondary": [
      "mollets"
    ],
    "equipment": "Machine",
    "bodyweight": false,
    "tips": "Hanches collées au banc.",
    "image": "Lying_Leg_Curls"
  },
  {
    "name": "Leg curl assis",
    "primary": "ischios",
    "secondary": [],
    "equipment": "Machine",
    "bodyweight": false,
    "tips": "Contrôler la remontée.",
    "image": "Seated_Leg_Curl"
  },
  {
    "name": "Nordic curl",
    "primary": "ischios",
    "secondary": [],
    "equipment": "Poids du corps",
    "bodyweight": true,
    "tips": "À genoux, chevilles bloquées, descendre le plus lentement possible.",
    "image": "Natural_Glute_Ham_Raise"
  },
  {
    "name": "Hip thrust barre",
    "primary": "fessiers",
    "secondary": [
      "ischios"
    ],
    "equipment": "Barre",
    "bodyweight": false,
    "tips": "Haut du dos sur un banc, pousser les hanches vers le haut et serrer.",
    "image": "Barbell_Hip_Thrust"
  },
  {
    "name": "Pont fessier",
    "primary": "fessiers",
    "secondary": [
      "ischios"
    ],
    "equipment": "Poids du corps",
    "bodyweight": true,
    "tips": "Allongé au sol, monter le bassin.",
    "image": "Butt_Lift_Bridge"
  },
  {
    "name": "Kickback poulie",
    "primary": "fessiers",
    "secondary": [
      "ischios"
    ],
    "equipment": "Poulie",
    "bodyweight": false,
    "tips": "Tendre la jambe vers l'arrière sans cambrer.",
    "image": "One-Legged_Cable_Kickback"
  },
  {
    "name": "Abducteurs machine",
    "primary": "fessiers",
    "secondary": [],
    "equipment": "Machine",
    "bodyweight": false,
    "tips": "Écarter les jambes, cible le moyen fessier.",
    "image": "Thigh_Abductor"
  },
  {
    "name": "Step-up",
    "primary": "fessiers",
    "secondary": [
      "quadriceps"
    ],
    "equipment": "Haltères",
    "bodyweight": false,
    "tips": "Monter sur un banc en poussant sur le talon.",
    "image": "Dumbbell_Step_Ups"
  },
  {
    "name": "Soulevé de terre sumo",
    "primary": "fessiers",
    "secondary": [
      "quadriceps",
      "adducteurs",
      "dos"
    ],
    "equipment": "Barre",
    "bodyweight": false,
    "tips": "Pieds très écartés, mains entre les jambes.",
    "image": "Sumo_Deadlift"
  },
  {
    "name": "Adducteurs machine",
    "primary": "adducteurs",
    "secondary": [],
    "equipment": "Machine",
    "bodyweight": false,
    "tips": "Rapprocher les jambes en contrôlant le retour.",
    "image": "Thigh_Adductor"
  },
  {
    "name": "Mollets debout machine",
    "primary": "mollets",
    "secondary": [],
    "equipment": "Machine",
    "bodyweight": false,
    "tips": "Monter le plus haut possible, descendre talons bas.",
    "image": "Standing_Calf_Raises"
  },
  {
    "name": "Mollets assis",
    "primary": "mollets",
    "secondary": [],
    "equipment": "Machine",
    "bodyweight": false,
    "tips": "Cible le soléaire (partie profonde du mollet).",
    "image": "Seated_Calf_Raise"
  },
  {
    "name": "Mollets à la presse",
    "primary": "mollets",
    "secondary": [],
    "equipment": "Machine",
    "bodyweight": false,
    "tips": "Pousser avec la pointe des pieds, jambes tendues.",
    "image": "Calf_Press_On_The_Leg_Press_Machine"
  }
];

export const PROGRAMME_DEPART = [
  {
    "name": "Quadriceps / Fessiers",
    "day": "Lundi",
    "muscles": [
      "quadriceps",
      "fessiers"
    ]
  },
  {
    "name": "Pecs / Biceps / Épaules",
    "day": "Mercredi",
    "muscles": [
      "pectoraux",
      "biceps",
      "epaules"
    ]
  },
  {
    "name": "Ischios / Fessiers",
    "day": "Vendredi",
    "muscles": [
      "ischios",
      "fessiers"
    ]
  },
  {
    "name": "Dos / Triceps / Abdos",
    "day": "Dimanche",
    "muscles": [
      "dos",
      "triceps",
      "abdominaux"
    ]
  }
];
