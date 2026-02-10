@echo off
setlocal

REM Run from repository root.

echo [1/8] Installing dependencies (safe if already installed)...
call npm install || goto :fail

echo [2/8] Running tests...
call npm run test || goto :fail

echo [3/8] Running typecheck...
call npm run typecheck || goto :fail

echo [4/8] Building web app...
call npm run build || goto :fail

echo [5/8] Applying app logo to Android launcher icons...
call npm run mobile:icons:android || goto :fail

echo [6/8] Syncing web to Android...
call npm run mobile:sync || goto :fail

echo [7/8] Building RELEASE APK...
call npm run mobile:apk:release:win || goto :fail

dir /s /b android\app\build\outputs\apk\*.apk

if exist android\app\build\outputs\apk\release\app-release-unsigned.apk (
  echo.
  echo INFO: Unsigned release APK detected. Running local signing helper...
  call windows-sign-release-apk.cmd || goto :fail
)

echo.
echo SUCCESS: Next-iteration RELEASE build completed.
pause
exit /b 0

:fail
echo.
echo ERROR: Build failed.
pause
exit /b 1
