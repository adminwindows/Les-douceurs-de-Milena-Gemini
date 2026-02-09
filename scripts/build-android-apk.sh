#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-debug}"

if [[ ! -d "android" ]]; then
  echo "❌ Android project not found. Run: npm run mobile:add:android"
  exit 1
fi

if [[ ! -f "android/gradlew" ]]; then
  echo "❌ Gradle wrapper not found at android/gradlew. Re-run: npm run mobile:add:android"
  exit 1
fi

pushd android >/dev/null

case "$MODE" in
  debug)
    ./gradlew assembleDebug
    ;;
  release)
    ./gradlew assembleRelease
    ;;
  *)
    echo "❌ Unknown mode '$MODE'. Use: debug | release"
    exit 1
    ;;
esac

popd >/dev/null

apk_output_dir="android/app/build/outputs/apk/$MODE"
apk_candidates=$(find "$apk_output_dir" -type f -name "*.apk" 2>/dev/null || true)

if [[ -z "$apk_candidates" ]]; then
  echo "❌ Build finished but no APK was found under $apk_output_dir"
  exit 1
fi

echo "✅ $MODE build APK(s):"
while IFS= read -r apk; do
  [[ -z "$apk" ]] && continue
  abs_apk=$(cd "$(dirname "$apk")" && pwd)/"$(basename "$apk")"
  echo "- Relative: $apk"
  echo "  Absolute: $abs_apk"
done <<< "$apk_candidates"
