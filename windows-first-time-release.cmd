@echo off
setlocal enabledelayedexpansion

REM Run from repository root.

echo [1/12] Removing previous install artifacts...
if exist node_modules rmdir /s /q node_modules
if exist dist rmdir /s /q dist

if exist android (
  if exist android\gradlew.bat (
    pushd android
    call gradlew.bat --stop >nul 2>&1
    popd
  )
  rmdir /s /q android
  if exist android (
    timeout /t 2 /nobreak >nul
    rmdir /s /q android
  )
  if exist android (
    echo.
    echo ERROR: Could not remove android\ because some files are locked by another process.
    echo Close Android Studio/Gradle/Java processes and run again.
    pause
    exit /b 1
  )
)

if exist ios rmdir /s /q ios
if exist package-lock.json del /f /q package-lock.json

echo [2/12] Installing dependencies...
call npm install || goto :fail

echo [3/12] Running tests...
call npm run test || goto :fail

echo [4/12] Running typecheck...
call npm run typecheck || goto :fail

echo [5/12] Building web app...
call npm run build || goto :fail

echo [6/12] Creating Android project...
call npm run mobile:add:android || goto :fail

echo [7/12] Applying app logo to Android launcher icons...
call npm run mobile:icons:android || goto :fail

echo [8/12] Syncing native project...
call npm run mobile:sync || goto :fail

echo [9/12] Building RELEASE APK...
call npm run mobile:apk:release:win || goto :fail

echo [10/12] APK outputs:
dir /s /b android\app\build\outputs\apk\*.apk

if exist android\app\build\outputs\apk\release\app-release-unsigned.apk (
  echo.
  echo INFO: Unsigned release APK detected. Running local signing helper...
  call windows-sign-release-apk.cmd || goto :fail
)

echo [11/12] NOTE: release APK can be unsigned unless signing config is set.
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
