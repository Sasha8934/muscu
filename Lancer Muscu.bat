@echo off
rem Double-clique sur ce fichier pour lancer l'application.
rem Pour l'arreter : ferme cette fenetre noire.
cd /d "%~dp0"
start "" /b cmd /c "timeout /t 3 >nul & start http://127.0.0.1:5000"
python app.py
pause
