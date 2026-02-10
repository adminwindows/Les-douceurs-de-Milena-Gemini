@echo off
setlocal

REM Run from repository root.

echo [1/5] Installing dependencies (safe if already installed)...
call npm install || goto :fail

echo [2/5] Running tests...
call npm run test || goto :fail

echo [3/5] Running typecheck...
call npm run typecheck || goto :fail

echo [4/5] Syncing web to Android...
call npm run mobile:sync || goto :fail

echo [5/5] Building DEBUG APK...
call npm run mobile:apk:debug:win || goto :fail

dir /s /b android\app\build\outputs\apk\*.apk

echo.
echo SUCCESS: Next-iteration DEBUG build completed.
pause
exit /b 0

:fail
echo.
echo ERROR: Build failed.
pause
exit /b 1
