# Muscu en ligne (GitHub Pages, gratuit, sans serveur)

Muscu est une application **sans serveur** (comme Syrinx) : des pages HTML, du CSS et du JavaScript.
Les données sont enregistrées **dans l'appareil** (téléphone ou PC), jamais sur Internet.

- Adresse : https://sasha8934.github.io/muscu/
- Code : https://github.com/Sasha8934/muscu (branche `main`, publiée depuis la racine)

## Publier une nouvelle version

1. Dans `sw.js`, augmenter `VERSION` (ex. `v1` -> `v2`). Sinon les téléphones gardent l'ancienne version.
   Ajouter à `FICHIERS_APP` tout nouveau fichier JavaScript ou CSS.
2. `git add -A`, `git commit -m "…"`, `git push`.
3. Attendre 1 à 2 minutes, puis ouvrir l'adresse et vérifier.

## Installer sur le téléphone

- **iPhone (Safari)** : bouton Partager > « Sur l'écran d'accueil ».
- **Android (Chrome)** : menu ⋮ > « Ajouter à l'écran d'accueil » (ou « Installer l'application »).

Une fois ouverte une première fois, l'appli marche **sans réseau**.

## Sauvegarder / changer d'appareil

Onglet **Programme** > **Sauvegarde** : « Sauvegarder » crée un fichier, « Restaurer » le recharge
(sur le même appareil ou sur un autre). Les données du PC et du téléphone sont séparées.

## Utiliser sur le PC

Double-clic sur `Lancer Muscu.bat` (adresse http://127.0.0.1:8001). Les données de cette adresse
sont séparées de celles du site en ligne.
