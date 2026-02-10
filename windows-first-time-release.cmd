@echo off
setlocal enabledelayedexpansion

REM Run from repository root.

echo [1/11] Removing previous install artifacts...
if exist node_modules rmdir /s /q node_modules
if exist dist rmdir /s /q dist
if exist android rmdir /s /q android
if exist ios rmdir /s /q ios
if exist package-lock.json del /f /q package-lock.json

echo [2/11] Installing dependencies...
call npm install || goto :fail

echo [3/11] Running tests...
call npm run test || goto :fail

echo [4/11] Running typecheck...
call npm run typecheck || goto :fail

echo [5/11] Building web app...
call npm run build || goto :fail

echo [6/11] Creating Android project...
call npm run mobile:add:android || goto :fail

echo [7/11] Applying app logo to Android launcher icons...
call npm run mobile:icons:android || goto :fail

echo [8/11] Syncing native project...
call npm run mobile:sync || goto :fail

echo [9/11] Building RELEASE APK...
call npm run mobile:apk:release:win || goto :fail

echo [10/11] APK outputs:
dir /s /b android\app\build\outputs\apk\*.apk

echo [11/11] NOTE: release APK can be unsigned unless signing config is set.
echo Create key with windows-create-release-key.cmd then configure android signing.

echo.
echo SUCCESS: First-time RELEASE build completed.
pause
exit /b 0

:fail
echo.
echo ERROR: Build failed at step above.
pause
exit /b 1
