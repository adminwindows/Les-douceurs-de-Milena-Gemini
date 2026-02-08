#!/usr/bin/env bash
set -euo pipefail

echo "== Android first APK bootstrap =="

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js not found. Install Node.js 20+ and retry."
  exit 1
fi

if ! command -v java >/dev/null 2>&1; then
  echo "❌ Java not found. Install JDK 17 and retry."
  exit 1
fi

echo "✅ Node: $(node -v)"
echo "✅ Java: $(java -version 2>&1 | head -n 1)"

echo
echo "1) Checking Capacitor environment"
npm run mobile:doctor

echo
echo "2) Ensuring Android platform exists"
if [[ ! -d "android" ]]; then
  npm run mobile:add:android
  echo "✅ Android platform added"
else
  echo "✅ android/ already exists"
fi

echo
echo "3) Building web app + syncing native project"
npm run mobile:sync

echo
echo "4) Building debug APK"
npm run mobile:apk:debug

echo
echo "✅ Done. Your APK should be at:"
echo "android/app/build/outputs/apk/debug/app-debug.apk"
