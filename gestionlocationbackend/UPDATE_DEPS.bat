@echo off
REM Script de mise à jour des dépendances

echo Mise à jour des dépendances de sécurité...

REM Activer environnement virtuel
if exist .venv\Scripts\activate.bat (
    call .venv\Scripts\activate.bat
) else if exist env\Scripts\activate.bat (
    call env\Scripts\activate.bat
)

REM Mettre à jour les packages de sécurité
pip install --upgrade requests urllib3 chardet cryptography

REM Regénérer requirements.txt
pip freeze > requirements.txt

echo.
echo Dépendances mises à jour !
echo N'oubliez pas de commiter requirements.txt
pause
