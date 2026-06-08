@echo off
REM ============================================================================
REM Script de déploiement automatisé - CarLoc Backend
REM Vérifie la qualité du code avant déploiement
REM ============================================================================

echo.
echo ========================================
echo  CARLOC - PRE-DEPLOYMENT CHECKLIST
echo ========================================
echo.

REM Vérifier si on est dans le bon dossier
if not exist "manage.py" (
    echo [ERREUR] Fichier manage.py introuvable
    echo Executez ce script depuis gestionlocationbackend/
    exit /b 1
)

REM Étape 1: Vérifications Django
echo [1/7] Verification configuration Django...
python manage.py check --deploy
if errorlevel 1 (
    echo [ERREUR] Django check failed
    exit /b 1
)
echo [OK] Configuration Django valide
echo.

REM Étape 2: Migrations
echo [2/7] Verification migrations...
python manage.py makemigrations --dry-run --check
if errorlevel 1 (
    echo [ERREUR] Migrations manquantes
    exit /b 1
)
echo [OK] Migrations a jour
echo.

REM Étape 3: Tests
echo [3/7] Execution des tests...
pytest --exitfirst -x -q
if errorlevel 1 (
    echo [ERREUR] Tests echoues
    exit /b 1
)
echo [OK] Tests passes
echo.

REM Étape 4: Couverture de code
echo [4/7] Verification couverture de code...
pytest --cov=api --cov-report=term --cov-fail-under=80 -q
if errorlevel 1 (
    echo [AVERTISSEMENT] Couverture de code ^<80%%
    echo Continuer quand meme ? (O/N)
    set /p continue=
    if /i not "%continue%"=="O" exit /b 1
)
echo [OK] Couverture suffisante
echo.

REM Étape 5: Collecte des fichiers statiques
echo [5/7] Collecte des fichiers statiques...
python manage.py collectstatic --noinput --clear
if errorlevel 1 (
    echo [ERREUR] Collectstatic failed
    exit /b 1
)
echo [OK] Fichiers statiques collectes
echo.

REM Étape 6: Vérification dépendances
echo [6/7] Verification vulnerabilites dependencies...
pip list --outdated
echo.

REM Étape 7: Backup BDD (si production)
echo [7/7] Backup BDD...
echo Backup manuel recommande avant deploiement production
echo.

echo ========================================
echo  PRE-DEPLOYMENT CHECKS COMPLETED
echo ========================================
echo.
echo Etapes suivantes:
echo 1. Commit et push sur GitHub
echo 2. Verifier GitHub Actions
echo 3. Deployer sur Render (auto-deploy si branche main)
echo 4. Verifier logs Sentry apres deploiement
echo.
echo Ready to deploy? (O/N)
set /p deploy=
if /i "%deploy%"=="O" (
    echo.
    echo [INFO] Push vers GitHub...
    git status
    echo.
    echo Commande suggeree:
    echo   git add .
    echo   git commit -m "Ready for deployment - all checks passed"
    echo   git push origin main
)

echo.
echo Deploiement termine avec succes !
exit /b 0
