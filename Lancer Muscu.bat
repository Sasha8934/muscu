@echo off
rem Lance l'application Muscu sur cet ordinateur (comme Syrinx).
rem Double-cliquer sur ce fichier, puis laisser cette fenetre ouverte pendant l'utilisation.
rem Pour arreter : fermer cette fenetre.

cd /d "%~dp0"
echo Application Muscu : http://127.0.0.1:8001
echo Laissez cette fenetre ouverte. Fermez-la pour arreter l'application.
start "" "http://127.0.0.1:8001/"
python -m http.server 8001 --bind 127.0.0.1
