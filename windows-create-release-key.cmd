@echo off
setlocal

REM Run from repository root. This creates a local signing key for APK sharing.

if not exist android\keystores mkdir android\keystores

keytool -genkeypair -v ^
 -keystore android\keystores\milena-share.keystore ^
 -alias milena-share ^
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
echo SUCCESS: Key created at android\keystores\milena-share.keystore
echo Keep it safe. If you lose it, you cannot update previously signed APKs with the same identity.
pause
exit /b 0
