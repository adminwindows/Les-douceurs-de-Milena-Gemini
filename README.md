<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your app

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

## Tests & Checks

* Run unit tests: `npm run test`
* Run a typecheck: `npm run typecheck`
* Build for production: `npm run build`

## Mobile (Capacitor Scaffold)

This project includes a source-only Capacitor scaffold for Android/iOS packaging.

> Important: generated native folders (`android/`, `ios/`) and binaries (`.apk/.aab/.ipa`) are local artifacts and are intentionally not committed.

### Android APK (no Play Store required)


> Tip (Windows): if you previously installed with older lockfiles/overrides and see `Cannot read properties of undefined (reading "extract")` from Capacitor, run a clean reinstall:
> `rmdir /s /q node_modules` + delete `package-lock.json`, then `npm install`.
> The bootstrap scripts also auto-recreate an incomplete `android/` folder when key files are missing.
> If your script output still starts with `1) Checking Capacitor environment`, pull latest changes first (`git pull`) to get the repaired script order.

1. Install prerequisites locally:
   * Node.js 22+ (required by Capacitor CLI 8)
   * Java JDK 17
   * Android Studio (SDK + platform tools)
2. Install dependencies:
   `npm install`
3. Create Android native project (first time only):
   `npm run mobile:add:android`
4. Check Capacitor environment:
   `npm run mobile:doctor`
5. Build web app and sync into native shell:
   `npm run mobile:sync`
6. Build a debug APK:
   * Linux/macOS: `npm run mobile:apk:debug`
   * Windows: `npm run mobile:apk:debug:win`
7. Retrieve APK at:
   `android/app/build/outputs/apk/debug/app-debug.apk`

### iOS equivalent

* You can generate the iOS native project with `npm run mobile:add:ios` and sync with `npm run mobile:sync`.
* Building an installable iOS app (`.ipa`) still requires macOS + Xcode (local Mac or cloud macOS CI).

### Useful helper commands

* Open Android Studio: `npm run mobile:open:android`
* Open Xcode (macOS): `npm run mobile:open:ios`
* Release APK build:
  * Linux/macOS: `npm run mobile:apk:release`
  * Windows: `npm run mobile:apk:release:win`

### One-command helper scripts

If you use bash (Linux/macOS, or Git Bash/WSL on Windows), you can run:

* First-time bootstrap + debug APK build:
  `npm run mobile:bootstrap:android`
* Scripted build (debug by default):
  `npm run mobile:apk`
* Scripted explicit modes:
  * `npm run mobile:apk:script:debug`
  * `npm run mobile:apk:script:release`

If you are on native Windows PowerShell (no Git Bash/WSL), use:

* First-time bootstrap + debug APK build:
  `npm run mobile:bootstrap:android:win`
* Scripted build (debug by default):
  `npm run mobile:apk:win`
* Scripted explicit modes:
  * `npm run mobile:apk:script:debug:win`
  * `npm run mobile:apk:script:release:win`

The scripts live in:
* `scripts/bootstrap-android-apk.sh`
* `scripts/build-android-apk.sh`
* `scripts/bootstrap-android-apk.ps1`
* `scripts/build-android-apk.ps1`

## Data Persistence

* The app auto-saves data to your browser's local storage.
* Use the “Sauvegardes / Données” modal to export or import a JSON backup.
* Backup import/export now supports a native mobile bridge when available (device picker/save flow), with browser file input/download fallback.
* Storage is abstracted behind a storage engine interface (web localStorage default) with runtime bootstrap support for injecting native mobile adapters.
* App-state persistence is versioned (`milena_app_state_v2`) with migration from legacy key format (`milena_app_state_v1`) for backward compatibility.


## Current Functional Scope

The application currently includes:

* **Catalog management**: ingredients, recipes, and sellable products with validation.
* **Costing & pricing analytics**: variable costs, labor toggle, fixed-cost allocation, margin targets, TVA-aware pricing, and alternate purchase-price analysis modes.
* **Operations flow**: customer orders, shopping list generation, production batch logging, and stock/purchase tracking.
* **Monthly reporting**: report archiving with inventory-variation and spend-based costing options.
* **Data safety**: local autosave, selective import/export backup, and a reversible **Mode Démo** (multiple sample datasets + safe restore of original user data on exit).
* **Quality tooling**: Vitest test suite, typecheck script, and CI workflow for automated checks.
