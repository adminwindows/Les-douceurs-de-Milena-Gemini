@echo off
setlocal

REM Run from repository root.

echo [1/6] Installing dependencies (safe if already installed)...
call npm install || goto :fail

echo [2/6] Running tests...
call npm run test || goto :fail

echo [3/6] Running typecheck...
call npm run typecheck || goto :fail

echo [4/6] Building web app...
call npm run build || goto :fail

echo [5/6] Syncing web to Android...
call npm run mobile:sync || goto :fail

echo [6/6] Building RELEASE APK...
call npm run mobile:apk:release:win || goto :fail

dir /s /b android\app\build\outputs\apk\*.apk

echo.
echo SUCCESS: Next-iteration RELEASE build completed.
pause
exit /b 0

:fail
echo.
echo ERROR: Build failed.
pause
exit /b 1
