@echo off
setlocal enabledelayedexpansion

REM Run from repository root.

echo [1/10] Removing previous install artifacts...
if exist node_modules rmdir /s /q node_modules
if exist dist rmdir /s /q dist
if exist android rmdir /s /q android
if exist ios rmdir /s /q ios
if exist package-lock.json del /f /q package-lock.json

echo [2/10] Installing dependencies...
call npm install || goto :fail

echo [3/10] Running tests...
call npm run test || goto :fail

echo [4/10] Running typecheck...
call npm run typecheck || goto :fail

echo [5/10] Building web app...
call npm run build || goto :fail

echo [6/10] Creating Android project...
call npm run mobile:add:android || goto :fail

echo [7/10] Applying app logo to Android launcher icons...
call npm run mobile:icons:android || goto :fail

echo [8/10] Syncing native project...
call npm run mobile:sync || goto :fail

echo [9/10] Building DEBUG APK...
call npm run mobile:apk:debug:win || goto :fail

echo [10/10] APK outputs:
dir /s /b android\app\build\outputs\apk\*.apk

echo.
echo SUCCESS: First-time DEBUG build completed.
pause
exit /b 0

:fail
echo.
echo ERROR: Build failed at step above.
pause
exit /b 1
