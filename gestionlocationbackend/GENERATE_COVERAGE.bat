@echo off
REM Génération rapport de couverture de tests

echo ========================================
echo  GENERATION RAPPORT DE COUVERTURE
echo ========================================
echo.

REM Activer environnement virtuel
if exist .venv\Scripts\activate.bat (
    call .venv\Scripts\activate.bat
) else if exist env\Scripts\activate.bat (
    call env\Scripts\activate.bat
)

echo [1/3] Installation pytest-cov...
pip install pytest-cov pytest-django --quiet

echo.
echo [2/3] Execution tests avec couverture...
pytest --cov=api --cov-report=html --cov-report=term-missing --cov-report=json -v

echo.
echo [3/3] Rapport genere !
echo.
echo Fichiers generes :
echo  - htmlcov/index.html (rapport HTML)
echo  - coverage.json (badge)
echo  - .coverage (donnees brutes)
echo.
echo Ouverture du rapport HTML...
start htmlcov\index.html

pause
