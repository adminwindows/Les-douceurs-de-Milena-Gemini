@echo off
setlocal enableextensions

REM Run from repository root. This creates a local signing key for APK sharing.
set "KEYSTORE_PATH=milena-share.keystore"
set "LEGACY_KEYSTORE_PATH=android\keystores\milena-share.keystore"
set "KEY_ALIAS=milena-share"

if not exist "%KEYSTORE_PATH%" if exist "%LEGACY_KEYSTORE_PATH%" (
  echo.
  echo INFO: Found existing key at %LEGACY_KEYSTORE_PATH%.
  copy /y "%LEGACY_KEYSTORE_PATH%" "%KEYSTORE_PATH%" >nul
  if errorlevel 1 (
    echo ERROR: Failed to copy legacy key to project root.
    pause
    exit /b 1
  )
  echo SUCCESS: Existing key copied to project root at %KEYSTORE_PATH%.
  echo You can now reuse the same signing identity outside android\.
  pause
  exit /b 0
)

if exist "%KEYSTORE_PATH%" (
  echo.
  echo ERROR: %KEYSTORE_PATH% already exists in project root.
  echo Keep this file safe. Replacing it will break updates for already installed signed APKs.
  pause
  exit /b 1
)

keytool -genkeypair -v ^
 -keystore "%KEYSTORE_PATH%" ^
 -alias "%KEY_ALIAS%" ^
 -keyalg RSA ^
 -keysize 2048 ^
 -validity 3650

if errorlevel 1 (
  echo.
  echo ERROR: key creation failed.
  pause
  exit /b 1
)

echo.
echo SUCCESS: Key created at %KEYSTORE_PATH%
echo Keep it safe. If you lose it, you cannot update previously signed APKs with the same identity.
pause
exit /b 0
