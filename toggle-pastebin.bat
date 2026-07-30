@echo off
setlocal
title Toggle Pastebin Block
color 0A

set "HOSTS=C:\Windows\System32\drivers\etc\hosts"
set "MARKER=# obsidian-xeno-block"

:: Check admin
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Solicitando permisos de administrador...
    powershell -NoProfile -Command "try { Start-Process cmd -Verb RunAs -ArgumentList '/c \"\"%~f0\"\"' -ErrorAction Stop } catch { exit 1 }"
    if errorlevel 1 (
        echo.
        echo   [ERROR] No se pudo elevar permisos ^(UAC cancelado o bloqueado^).
        echo.
        pause
    )
    exit /b
)

:menu
cls
echo  ============================================
echo    Obsidian - Bloquear Pastebin
echo  ============================================
echo.

findstr /C:"%MARKER%" "%HOSTS%" >nul 2>&1
if %errorlevel%==0 (
    echo   Estado: BLOQUEADO
) else (
    echo   Estado: NO BLOQUEADO
)

echo.
echo   [1] Bloquear pastebin.com
echo   [2] Desbloquear pastebin.com
echo   [3] Salir
echo.
set /p "choice=  > "

if "%choice%"=="1" goto bloquear
if "%choice%"=="2" goto desbloquear
if "%choice%"=="3" exit /b 0
goto menu

:bloquear
findstr /C:"%MARKER%" "%HOSTS%" >nul 2>&1
if %errorlevel%==0 (
    echo.
    echo   [!] Ya estaba bloqueado
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$h = (Get-Content -LiteralPath '%HOSTS%' -Raw).TrimEnd(); Set-Content -LiteralPath '%HOSTS%' -Value ($h + [Environment]::NewLine + '127.0.0.1 pastebin.com www.pastebin.com' + [Environment]::NewLine + '%MARKER%') -Encoding UTF8"
    echo.
    echo   [OK] pastebin.com bloqueado
)
echo.
pause
goto menu

:desbloquear
findstr /C:"%MARKER%" "%HOSTS%" >nul 2>&1
if %errorlevel%==0 (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$h = Get-Content -LiteralPath '%HOSTS%'; $h | Where-Object { $_ -notmatch 'pastebin\.com' -and $_.Trim() -ne '%MARKER%' } | Set-Content -LiteralPath '%HOSTS%' -Encoding UTF8"
    echo.
    echo   [OK] pastebin.com desbloqueado
) else (
    echo.
    echo   [!] Ya estaba desbloqueado
)
echo.
pause
goto menu
