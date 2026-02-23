<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your app

This contains everything you need to run your app locally.

### Custom bakery logo (your image)

To use **your own logo image** in the app shell/report, place your file in `public/` with one of these names (priority order):

1. `logo-user.png`
2. `logo-user.jpg`
3. `logo-user.jpeg`
4. `logo-user.webp`
5. `logo-user.avif`

If none exists, the app automatically falls back to `logo-milena.svg`.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

By default, the app starts in **dark mode** (and remembers your theme choice).

## Tests & Checks

* Run unit tests: `npm run test`
* Run a typecheck: `npm run typecheck`
* Build for production: `npm run build`
* Node.js 25 note: Vitest workers can print `--localstorage-file` warnings due upstream Node/WebStorage behavior. This is non-blocking. One-click Windows helpers now run tests with `NODE_OPTIONS=--no-webstorage` on Node 25+ automatically. For manual CLI usage, prefer Node.js 22/24 LTS (recommended) or run tests with `set NODE_OPTIONS=--no-webstorage` in the current terminal.

## Mobile (Capacitor Scaffold)

This project includes a source-only Capacitor scaffold for Android/iOS packaging.

> Important: generated native folders (`android/`, `ios/`) and binaries (`.apk/.aab/.ipa`) are local artifacts and are intentionally not committed.

### Android APK (no Play Store required)


> Android launcher labels are controlled by the phone launcher and can be truncated by device width/grid settings. The app name is now shortened to `Miléna` to reduce truncation risk, but some launchers may still ellipsize long names.

> Tip (Windows): if you previously installed with older lockfiles/overrides and see `Cannot read properties of undefined (reading "extract")` from Capacitor, run a clean reinstall:
> `rmdir /s /q node_modules` + delete `package-lock.json`, then `npm install`.
> The bootstrap scripts also auto-recreate an incomplete `android/` folder when key files are missing.
> If your script output still starts with `1) Checking Capacitor environment`, pull latest changes first (`git pull`) to get the repaired script order.
> Security note: the project now uses Capacitor 8 on Node.js 22+ baseline (no local patch-package workaround), and `npm audit` stays clean with upstream dependency versions.

> If cleanup fails with "file is used by another process" (e.g. classes.dex), close Android Studio/emulator/Gradle daemons and rerun; first-time Windows scripts now try `gradlew --stop` and one retry before failing with a clear message.
> If SDK location errors still appear, set `ANDROID_HOME`/`ANDROID_SDK_ROOT` manually or create `android/local.properties` with `sdk.dir=...`.
> If you see `invalid source release: 21`, upgrade Java to JDK 21+ and ensure `java -version` points to that JDK.
> If Java 25 is active, root Windows helper scripts auto-switch to Android Studio JBR (`C:\Program Files\Android\Android Studio\jbr`) when available, because current Android Gradle stack is most stable on Java 21-24.
> `mobile:android:enforce-data-policy` also applies Gradle hygiene patches after `cap add/sync`: `flatDir` repos are enabled only when local `.aar` files exist, reducing avoidable `flatDir` warnings on clean Capacitor setups.
> If release install shows `Application non installée`, run `windows-sign-release-apk.cmd` (now uses `apksigner` + `zipalign` when available) and install `app-release-signed.apk`. If an older/debug app is already installed, uninstall it first because APKs signed with different keys cannot update each other.
> If `apksigner` prints Java restricted-access warnings, the script now passes `--enable-native-access=ALL-UNNAMED`; remaining warnings are informational and not the root failure.

1. Install prerequisites locally:
   * Node.js 22+ (required by Capacitor CLI 8+)
   * Java JDK 21+ (required by Android Gradle plugin used by Capacitor 8+)
   * Android Studio (SDK + platform tools)
2. Install dependencies:
   `npm install`
3. On Windows, ensure `ANDROID_HOME` or `ANDROID_SDK_ROOT` points to your SDK (or let the helper script auto-write `android/local.properties` when SDK is found).
4. Create Android native project (first time only):
   `npm run mobile:add:android`
5. Check Capacitor environment:
   `npm run mobile:doctor`
6. Build web app and sync into native shell:
   `npm run mobile:sync`
7. Build a debug APK:
   * Linux/macOS: `npm run mobile:apk:debug`
   * Windows: `npm run mobile:apk:debug:win`
8. Retrieve APK:
   * Default debug path: `android/app/build/outputs/apk/debug/app-debug.apk`
   * Common release path: `android/app/build/outputs/apk/release/app-release.apk` (or `app-release-unsigned.apk` if unsigned)
   * If unsure, run from repo root: `dir /s /b android\app\build\outputs\apk\*.apk` (Windows)
   * The bootstrap/build scripts now print discovered APK paths (relative + absolute).


### Windows quick commands (concise)

Use root-level one-click files:

- `windows-first-time-debug.cmd`
- `windows-first-time-release.cmd`
- `windows-next-debug.cmd`
- `windows-next-release.cmd`
- `windows-create-release-key.cmd`
- `windows-sign-release-apk.cmd`

These scripts are designed for double-click usage, run `npm run build` immediately after `npm run typecheck`, apply your logo to Android launcher icons, then native sync, and keep the window open with `pause`. They also clear inherited `NODE_OPTIONS` and both npm node-options env variants (`npm_config_node_options` / `NPM_CONFIG_NODE_OPTIONS`) to avoid noisy Node flag warnings in test runs. Release helpers also auto-call `windows-sign-release-apk.cmd` when they detect `app-release-unsigned.apk`.
`windows-create-release-key.cmd` now creates the key at `.\milena-share.keystore` (project root), outside `android/`, so first-time clean rebuilds do not delete it.
If you still have an older key at `android\keystores\milena-share.keystore`, the key helpers auto-migrate it to the project root path.
`milena-share.keystore` is now explicitly allowed in `.gitignore`, so it can be versioned in Git if you choose to archive it.
The key helper also tries to stage `milena-share.keystore` automatically in Git (`git add`) when Git is available.

### iOS equivalent

* You can generate the iOS native project with `npm run mobile:add:ios` and sync with `npm run mobile:sync`.
* Building an installable iOS app (`.ipa`) still requires macOS + Xcode (local Mac or cloud macOS CI).

### Useful helper commands

* Open Android Studio: `npm run mobile:open:android`
* Open Xcode (macOS): `npm run mobile:open:ios`
* Release APK build:
  * Linux/macOS: `npm run mobile:apk:release`
  * Windows: `npm run mobile:apk:release:win`
* Sign an existing unsigned release APK (Windows): `windows-sign-release-apk.cmd`
  * Passwords are requested directly by `apksigner`/`jarsigner` prompts (safer with special characters than inline CMD args).
* Generate Android launcher icons from your logo: `npm run mobile:icons:android`
* App icon/splash generation via `@capacitor/assets` remains out of default flow to avoid deprecated/vulnerable transitive dependency noise during normal installs.

### Debug vs Release signing (quick explanation)

* **Why debug APK is signed automatically:** Android uses a default debug keystore (auto-managed by Gradle) so debug builds can be installed easily.
* **Why release APK can be unsigned:** release builds require an explicit signing config.
* **No store credentials required for sharing APK:** you can use a **throwaway local keystore** (not Google Play credentials).

Example (local keystore only, for direct sharing):

1. Create a local key once:
   * `keytool -genkeypair -v -keystore .\milena-share.keystore -alias milena-share -keyalg RSA -keysize 2048 -validity 3650`
2. Configure your local Android signing (in your local `android/` project) with that keystore.
3. Build release APK:
   * Linux/macOS: `npm run mobile:apk:release`
   * Windows: `npm run mobile:apk:release:win`

This signs the APK for install/share without publishing on stores.

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
* `windows-first-time-debug.cmd`
* `windows-first-time-release.cmd`
* `windows-next-debug.cmd`
* `windows-next-release.cmd`
* `windows-create-release-key.cmd`
* `windows-sign-release-apk.cmd`

## Data Persistence

* The app now uses natural persistence for business data (catalog, orders, production, reports): edits are saved automatically.
* Form-level `Annuler` actions cancel the current form input only; they no longer depend on a global save banner.
* Android native builds now enforce `android:allowBackup="true"` (via `mobile:android:enforce-data-policy`, called by `mobile:add:android` and `mobile:sync`) for classic Android backup/restore behavior.
* Normal app updates still keep data.
* With backup enabled, uninstall + reinstall can restore prior data from Android backup.
* Use the `Sauvegardes / Donnees` modal action `Reinitialiser toutes les donnees` to wipe all local state (app snapshot, demo session, theme preference, and any legacy keys).
* The same modal shows local storage usage (managed keys vs total).
* Browser/PWA uninstall does not always clear origin storage; for web resets, use the reset action above or clear site data in browser settings.
* Use the “Sauvegardes / Données” modal to export or import a JSON backup.
* Backup import/export supports a native mobile bridge when available (device picker/save flow), with browser file input/download fallback.
* Storage is abstracted behind a storage engine interface (web localStorage default) with runtime bootstrap support for injecting native mobile adapters.
* Monthly report PDF export now prefers native share on mobile (so you can save/share to Drive, Files, WhatsApp, etc.), with download fallback.
* App-state persistence is versioned (`milena_app_state_v2`) with migration from legacy key format (`milena_app_state_v1`) for backward compatibility.


## Current Functional Scope

The application currently includes:

* **Catalog management**: ingredients, recipes, and sellable products with validation.
* **Costing & pricing analytics**: fixed-cost allocation, minimum price, dual recommendation modes (**Marge cible** and **Salaire cible**), product standard price, and salary helper simulation (units needed per product mix).
  * TVA is now global-only (`isTvaSubject` + `defaultTvaRate`), with one TVA rate per order and per monthly-sales line.
  * No labor-cost toggle in pricing formulas.
* **Operations flow**: customer orders, shopping list generation, production batch logging, and stock/purchase tracking.
* **Monthly reporting**: separate sections for sales lines and unsold quantities, duplicate product lines supported (different price/TVA combinations), report archiving with frozen loaded lines, and PDF export.
  * Theoretical monthly costing supports ingredient price source selection: `Prix moyen lissé` or `Dernier prix`.
* **Data safety**: natural local persistence, selective import/export backup, and a reversible **Mode Démo** (multiple sample datasets + safe restore of original user data on exit).
* **Branding & UX**: bakery logo integrated in app shell/report visuals, improved mobile header fit, and explicit Oui/Non confirmation modal when validating delivered orders.
* **Quality tooling**: Vitest test suite, typecheck script, and CI workflow for automated checks.
