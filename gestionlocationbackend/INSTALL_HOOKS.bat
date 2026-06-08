@echo off
REM ============================================================================
REM Installation des pre-commit hooks - CarLoc
REM ============================================================================

echo.
echo ========================================
echo  INSTALLATION PRE-COMMIT HOOKS
echo ========================================
echo.

REM Installer pre-commit
echo [1/3] Installation de pre-commit...
pip install pre-commit
if errorlevel 1 (
    echo [ERREUR] Installation pre-commit failed
    exit /b 1
)
echo [OK] pre-commit installe
echo.

REM Installer les hooks
echo [2/3] Installation des hooks Git...
cd ..
pre-commit install
if errorlevel 1 (
    echo [ERREUR] Installation hooks failed
    exit /b 1
)
echo [OK] Hooks Git installes
echo.

REM Test des hooks
echo [3/3] Test des hooks...
pre-commit run --all-files
echo.

echo ========================================
echo  INSTALLATION TERMINEE
echo ========================================
echo.
echo Les hooks seront maintenant executes automatiquement avant chaque commit.
echo.
echo Pour executer manuellement: pre-commit run --all-files
echo Pour desactiver: pre-commit uninstall
echo.

pause
