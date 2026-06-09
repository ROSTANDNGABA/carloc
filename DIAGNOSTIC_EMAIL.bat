@echo off
REM ============================================================================
REM Script de Diagnostic Email - CarLoc
REM ============================================================================

echo.
echo ============================================================================
echo DIAGNOSTIC EMAIL CARLOC
echo ============================================================================
echo.

REM Activation environnement virtuel
if exist env\Scripts\activate.bat (
    call env\Scripts\activate.bat
    echo [OK] Environnement virtuel active
) else (
    echo [ERREUR] Environnement virtuel introuvable
    echo Verifiez que le dossier "env" existe
    exit /b 1
)

cd gestionlocationbackend

echo.
echo ============================================================================
echo 1. VERIFICATION CONFIGURATION EMAIL
echo ============================================================================
echo.

REM Afficher la configuration email actuelle
python manage.py shell -c "from django.conf import settings; print('EMAIL_BACKEND:', settings.EMAIL_BACKEND); print('EMAIL_PROVIDER:', getattr(settings, 'EMAIL_PROVIDER', 'non defini')); print('EMAIL_HOST:', settings.EMAIL_HOST); print('EMAIL_PORT:', settings.EMAIL_PORT); print('EMAIL_USE_TLS:', settings.EMAIL_USE_TLS); print('EMAIL_HOST_USER:', settings.EMAIL_HOST_USER or '(vide)'); print('DEFAULT_FROM_EMAIL:', settings.DEFAULT_FROM_EMAIL); print('BREVO_API_KEY:', 'defini' if getattr(settings, 'BREVO_API_KEY', '') else 'NON DEFINI')"

echo.
echo ============================================================================
echo 2. VERIFICATION INSTALLATION ANYMAIL
echo ============================================================================
echo.

python -c "import anymail; print('[OK] django-anymail version:', anymail.__version__)" 2>nul || echo [ERREUR] django-anymail non installe

echo.
echo ============================================================================
echo 3. TEST D'ENVOI EMAIL
echo ============================================================================
echo.

set /p email="Entrez l'adresse email de test (ou appuyez sur Entree pour utiliser CARLOC_ADMIN_EMAIL): "

if "%email%"=="" (
    echo Test d'envoi vers l'email admin configure...
    python manage.py test_email
) else (
    echo Test d'envoi vers %email%...
    python manage.py test_email --to %email%
)

echo.
echo ============================================================================
echo 4. VERIFICATION LOGS NOTIFICATIONS
echo ============================================================================
echo.

python manage.py shell -c "from api.models import NotificationLog; logs = NotificationLog.objects.all().order_by('-date_envoi')[:5]; print(f'Nombre total de notifications: {NotificationLog.objects.count()}'); print(f'Notifications reussies: {NotificationLog.objects.filter(envoye=True).count()}'); print(f'Notifications echouees: {NotificationLog.objects.filter(envoye=False).count()}'); print('\nDernieres notifications:'); [print(f'- {log.date_envoi.strftime(\"%%Y-%%m-%%d %%H:%%M\")} | Type: {log.type_notification} | Envoye: {log.envoye} | Destinataire: {log.destinataire} | Erreur: {log.erreur or \"(aucune)\"}') for log in logs]"

echo.
echo ============================================================================
echo DIAGNOSTIC TERMINE
echo ============================================================================
echo.
echo Consultez le guide GUIDE_CONFIGURATION_EMAIL.md pour les solutions
echo.

cd ..
pause
