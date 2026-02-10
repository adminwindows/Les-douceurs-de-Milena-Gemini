@echo off
setlocal enabledelayedexpansion

REM Run from repository root.

echo [1/8] Removing previous install artifacts...
if exist node_modules rmdir /s /q node_modules
if exist dist rmdir /s /q dist
if exist android rmdir /s /q android
if exist ios rmdir /s /q ios
if exist package-lock.json del /f /q package-lock.json

echo [2/8] Installing dependencies...
call npm install || goto :fail

echo [3/8] Running tests...
call npm run test || goto :fail

echo [4/8] Running typecheck...
call npm run typecheck || goto :fail

echo [5/8] Creating Android project...
call npm run mobile:add:android || goto :fail

echo [6/8] Building web + syncing native project...
call npm run mobile:sync || goto :fail

echo [7/8] Building DEBUG APK...
call npm run mobile:apk:debug:win || goto :fail

echo [8/8] APK outputs:
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
