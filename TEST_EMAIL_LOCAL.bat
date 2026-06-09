@echo off
REM ============================================================================
REM Test Email Local - CarLoc
REM ============================================================================

echo.
echo ============================================================================
echo TEST EMAIL CARLOC - LOCAL
echo ============================================================================
echo.

REM Activation environnement virtuel
if exist env\Scripts\activate.bat (
    call env\Scripts\activate.bat
    echo [OK] Environnement virtuel active
) else (
    echo [ERREUR] Environnement virtuel introuvable
    echo Verifiez que le dossier "env" existe
    pause
    exit /b 1
)

cd gestionlocationbackend

echo.
echo ============================================================================
echo CONFIGURATION ACTUELLE
echo ============================================================================
echo.

python manage.py shell -c "from django.conf import settings; print('Backend:', settings.EMAIL_BACKEND); print('Provider:', getattr(settings, 'EMAIL_PROVIDER', 'non defini')); print('Host:', settings.EMAIL_HOST); print('Port:', settings.EMAIL_PORT); print('TLS:', settings.EMAIL_USE_TLS); print('User:', settings.EMAIL_HOST_USER or '(vide)'); print('From:', settings.DEFAULT_FROM_EMAIL)"

echo.
echo ============================================================================
echo TEST D'ENVOI
echo ============================================================================
echo.

set /p email="Entrez votre adresse email pour le test: "

if "%email%"=="" (
    echo [ERREUR] Adresse email requise
    cd ..
    pause
    exit /b 1
)

echo.
echo Envoi d'un email de test vers: %email%
echo.

python manage.py test_email --to %email%

echo.
echo ============================================================================
echo VERIFICATION
echo ============================================================================
echo.

echo 1. Verifiez votre boite email: %email%
echo 2. Cherchez un email avec le sujet: "CarLoc - Test de configuration e-mail"
echo 3. Si l'email n'arrive pas:
echo    - Verifiez le dossier SPAM
echo    - Consultez les logs ci-dessus pour identifier l'erreur
echo    - Verifiez votre fichier .env (gestionlocationbackend\.env)
echo.

cd ..
pause
