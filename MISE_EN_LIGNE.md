# Mettre Muscu en ligne (PythonAnywhere, gratuit)

Le code est sur GitHub ; PythonAnywhere le fait tourner. La base de données (`muscu.db`) n'est **jamais** envoyée sur GitHub (voir `.gitignore`) : elle vit seulement sur PythonAnywhere.

## Installation (une seule fois)

1. Créer un compte gratuit « Beginner » sur https://www.pythonanywhere.com
2. Onglet **Consoles** > **Bash**, puis taper :
   ```
   git clone https://github.com/Sasha8934/muscu.git
   ```
3. Onglet **Web** > **Add a new web app** > **Manual configuration** > la dernière version de Python proposée.
4. Dans l'onglet **Web** :
   - **Source code** : `/home/TON-PSEUDO/muscu`
   - **Static files** : URL `/static/`, dossier `/home/TON-PSEUDO/muscu/static`
   - **Force HTTPS** : activé
   - Cliquer sur le lien du **WSGI configuration file**, tout effacer et coller le modèle ci-dessous (remplacer les 3 valeurs), puis **Save**.
5. Bouton vert **Reload**, puis ouvrir `https://TON-PSEUDO.pythonanywhere.com`.

### Modèle du fichier WSGI

```python
import os
import sys

os.environ["MUSCU_PASSWORD"] = "ton mot de passe"          # demandé pour entrer dans l'appli
os.environ["MUSCU_SECRET_KEY"] = "une longue phrase secrète au hasard"  # ne la donne à personne
sys.path.insert(0, "/home/TON-PSEUDO/muscu")

from app import app as application
```

## Mettre à jour l'appli après une modification

1. Sur le PC : `git push` (envoie le nouveau code sur GitHub).
2. Sur PythonAnywhere, console **Bash** : `cd muscu && git pull`
3. Onglet **Web** : bouton **Reload**.

Les données ne sont pas touchées par une mise à jour.

## À faire une fois par mois

Compte gratuit : l'appli s'arrête si on ne la prolonge pas. Onglet **Web** > bouton « **Run until 1 month from today** » (PythonAnywhere envoie un e-mail de rappel).

## Sauvegarder ses données

Onglet **Files** > `muscu/muscu.db` > **Download**.
