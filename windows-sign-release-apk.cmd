@echo off
setlocal enabledelayedexpansion

REM Run from repository root. Signs app-release-unsigned.apk using local keystore.

set "UNSIGNED_APK=android\app\build\outputs\apk\release\app-release-unsigned.apk"
set "SIGNED_APK=android\app\build\outputs\apk\release\app-release-signed.apk"
set "KEYSTORE_PATH=android\keystores\milena-share.keystore"
set "KEY_ALIAS=milena-share"

if not exist "%UNSIGNED_APK%" (
  echo.
  echo ERROR: %UNSIGNED_APK% not found.
  echo Build release first with windows-first-time-release.cmd or windows-next-release.cmd.
  pause
  exit /b 1
)

if not exist "%KEYSTORE_PATH%" (
  echo.
  echo ERROR: %KEYSTORE_PATH% not found.
  echo Create one first with windows-create-release-key.cmd.
  pause
  exit /b 1
)

echo.
echo Enter keystore password for %KEYSTORE_PATH%
set /p STOREPASS=Keystore password: 
if "%STOREPASS%"=="" (
  echo ERROR: Empty password.
  pause
  exit /b 1
)

set /p KEYPASS=Key password ^(press Enter to reuse keystore password^): 
if "%KEYPASS%"=="" set "KEYPASS=%STOREPASS%"

copy /y "%UNSIGNED_APK%" "%SIGNED_APK%" >nul
if errorlevel 1 goto :fail

jarsigner -sigalg SHA256withRSA -digestalg SHA-256 -keystore "%KEYSTORE_PATH%" -storepass "%STOREPASS%" -keypass "%KEYPASS%" "%SIGNED_APK%" "%KEY_ALIAS%"
if errorlevel 1 goto :fail

jarsigner -verify -verbose -certs "%SIGNED_APK%" >nul
if errorlevel 1 goto :fail

echo.
echo SUCCESS: Signed APK created:
echo %SIGNED_APK%
pause
exit /b 0

:fail
echo.
echo ERROR: APK signing failed.
pause
exit /b 1
