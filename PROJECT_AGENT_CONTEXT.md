# Project Agent Context (Persistent Handoff)

> Purpose: give any new agent full continuity of this project and user expectations.
> Mandatory rule: update this file **after every user request** by appending new context, not deleting prior requests.

## 1) User Profile & Working Preferences

- User is beginner-friendly and wants detailed, practical, step-by-step explanations.
- User prefers **Windows-first** guidance (CMD/PowerShell), then cross-platform notes.
- User wants copy/paste commands and root-level one-click scripts over abstract instructions.
- User expects proof (tests, checks, screenshots when UI changes are visible).
- User wants README/build instructions and scripts synchronized.
- User does not want long answer dumps moved into docs when the answer should be in chat.
- User wants persistent context with **all prior requests retained** (no silent omissions).
- User explicitly requested root `.cmd` files that do not auto-close (`pause` on success/failure).
- User can use strong language when frustrated; agent should still execute precisely.

## 2) Product Domain & Core Goals

Bakery management/costing app (Les douceurs de Miléna): ingredients, recipes, products, orders, production, stock, monthly report, backup/import/export, demo mode, and mobile packaging via Capacitor.

Priorities:
1. Reliability and data safety.
2. Practical real-world UX for bakery workflows.
3. Correct calculations and verification.
4. Easy APK creation and sharing (without store publication complexity).

## 3) Canonical Historical Request Log (No Omissions)

1. Read saved HTML conversation context and summarize major goals.
2. Mobile questions: debug/release signing, mobile fit issues, Oui/Non labels, report save/print behavior, and logo usage.
3. Beginner-friendly detailed explanations requested.
4. Full beginner setup/install/test/mobile guide requested.
5. Windows-first commands for clean reinstall, first build, next iteration, debug/release, release key creation, and logo behavior clarification.
6. Root-level clickable `.cmd` files requested (not inside `scripts/`) and persistent console windows requested.
7. User reported still seeing scripts in `scripts/`; verification/fix flow requested.
8. Requested persistent context file to transfer all context automatically to future agents, and line-by-line CMD explanation.
9. User rejected storing line-by-line explanation in repo file; requested answers directly in chat and reduced README pollution.
10. Feature requests: provided logo usage, persistent section drafts for all sections, cancel creation with confirmation everywhere, edit/delete capabilities across sections, unit shown while entering recipe ingredient quantity, decimal separator `.`.
11. User said not all requests were tackled; follow-up fixes requested.
12. User reiterated missing items: logo, units, decimal dot behavior.
13. User reiterated exact logo file must be used and decimal dot input required.
14. User asked again to use attached image directly.
15. Asked why `package-lock.json` had many diffs.
16. Requested fix (Capacitor/Node/toolchain path issues).
17. Requested additional fix (audit/deprecation noise).
18. Requested line-by-line explanation of `windows-first-time-debug.cmd` and why each line exists.
19. Reported lingering issue; asked for fix.
20. Asked how to get logo after asset-flow changes.
21. Requested explicit `npm run build` in CMD flows.
22. Requested build to run **immediately after typecheck** and complained that older requests were being removed from context; demanded complete persistent context.

## 4) Implemented State Snapshot

- App branding/logo system exists (`BrandLogo`, fallback chain, custom `public/logo-user.*` support).
- Monthly report includes PDF export.
- Oui/Non delivery confirmation modal exists in Orders.
- Persistent draft state and cancel/edit improvements were introduced across key views in prior work.
- Root Windows helper files exist:
  - `windows-first-time-debug.cmd`
  - `windows-first-time-release.cmd`
  - `windows-next-debug.cmd`
  - `windows-next-release.cmd`
  - `windows-create-release-key.cmd`
- Scripts use fail-fast style and keep terminal open via `pause`.

## 5) Current Request Status (Latest Turn)

User request:
1. Run `npm run build` immediately after `npm run typecheck` in CMD flows.
2. Stop removing older requests from context; keep full history.

Actions taken:
- Reordered first-time scripts so `build` runs directly after `typecheck`:
  - `windows-first-time-debug.cmd`
  - `windows-first-time-release.cmd`
- Confirmed next-iteration scripts already had build immediately after typecheck and left them consistent.
- Updated README wording to match the exact order.
- Reworked this context file to include a complete historical request log and explicit append/no-omission rule.

## 6) Update Protocol (Mandatory)

After each user turn:
1. Append/update this file with the new request and exact disposition.
2. Never remove prior user requests from the historical log.
3. Keep README + root CMD flows synchronized when workflow changes.
4. Run relevant checks and report outcomes.

## 7) Risks / Notes

- Mobile/Capacitor builds still depend on local Android SDK/JDK environment.
- Browser screenshot tooling can fail intermittently in container environments.
- Release signing requires local keystore + Gradle signing config but no Play Store credentials.


## 8) Latest Turn Update (Capacitor add android failure report)

User report:
- Running first-time Windows script now reaches step 6, but `cap add android` fails with `TypeError: Cannot read properties of undefined (reading 'extract')` from `@capacitor/cli/dist/util/template.js`.

Diagnosis:
- Root cause was `package.json` override forcing `tar` to v7, while Capacitor CLI 7 expects the v6 API shape used by `tar.extract(...)` in CommonJS default import form.

Actions taken:
- Changed `package.json` override from `tar: ^7.5.7` to `tar: ^6.2.1` to restore Capacitor CLI compatibility.
- Regenerated lockfile with `npm install`.
- Validated fix by deleting local `android/` and re-running `npm run mobile:add:android`; command now succeeds and creates native Android project.
- Updated README note to reflect the compatible override rationale.

Validation commands run:
- `npm run mobile:add:android` (before fix: extract error; after fix: success)
- `npm run typecheck`
- `npm run test`
- `npm run build`


## 9) Latest Turn Update (tar vulnerability concern)

User question:
- "are you sure this tar version doesn't create vulnerabilities?"

What was verified:
- With `tar` forced to `^6.2.1`, `npm audit` reported high vulnerabilities in tar transitive path through `@capacitor/cli`.

Resolution implemented:
- Set `overrides.tar` back to patched `^7.5.7` (audit-clean).
- Added `patch-package` + `postinstall` hook to apply a targeted compatibility patch to `@capacitor/cli@7.4.5` template extractor so it can resolve `tar.extract` from either tar module shape (v6/v7).
- Added patch file: `patches/@capacitor+cli+7.4.5.patch`.
- Updated README security note to explain this secure+compatible setup.

Validation:
- `npm audit --audit-level=high` => 0 vulnerabilities.
- Removed local `android/` and re-ran `npm run mobile:add:android` => succeeds (no extract crash).

Tradeoff note:
- This keeps Node 20 compatibility for Capacitor 7 while avoiding vulnerable tar versions.


## 10) Latest Turn Update (question about workaround without patches)

User question:
- "There is no workaround without patches?"

Clarification recorded:
- For the current compatibility target (Node 20 + Capacitor 7), a local compatibility patch is currently the practical way to keep both `cap add android` working and `npm audit` clean with patched tar versions.
- A no-patch path does exist, but it requires moving to Node 22+ with Capacitor 8 (upstream alignment), which changes the project baseline.

Actions taken:
- Added explicit README note describing the no-patch alternative (Node 22 + Capacitor 8) versus current Node 20 + Capacitor 7 compatibility choice.


## 11) Latest Turn Update (user approved Node 24 migration path)

User input:
- "go for it, I have node 24" (approve no-patch route).

Actions taken:
- Migrated project baseline to Capacitor 8 + Node 22+ expectation (compatible with user Node 24).
- Updated dependencies to `@capacitor/*` `^8.0.2` in `package.json`.
- Removed local workaround stack used for Capacitor 7 compatibility:
  - removed `patch-package` dependency and `postinstall` script,
  - removed `overrides.tar`,
  - removed `patches/@capacitor+cli+7.4.5.patch`.
- Updated README mobile/security guidance to reflect new no-patch baseline and Capacitor CLI 8 Node requirement.
- Corrected bootstrap script node-major gate checks from `<20` to `<22` so runtime checks match the new documented Node 22+ baseline.

Validation in current CI/container environment:
- `npm install` (shows expected engine warning because container Node is 20, not 22+).
- `npm run typecheck`, `npm run test`, `npm run build`, `npm audit --audit-level=high` all pass.
- `npm run mobile:add:android` fails here with expected Node version gate (`NodeJS >=22.0.0`) due container limitation, consistent with new baseline and user's local Node 24 readiness.


## 12) Latest Turn Update (mobile UI/unit/icon issues from screenshots)

User reports from screenshots:
- Recipe ingredient row showed redundant unit hint (placeholder and unit badge duplicated).
- Unit mismatch confusion (`kg` shown at entry, then `g` shown after add).
- Mobile screen-fit still felt like overflow; requested locked top/bottom delimiters while content scrolls.
- Android app icon looked wrong/default.

Actions implemented:
- Recipe creation unit UX:
  - removed redundant unit in quantity placeholder (`Qté` only),
  - normalized recipe unit display to base recipe units (`g`, `ml`, `pièce`) everywhere in that flow (selector label, quantity badge, added-ingredient list, scaler panel), keeping units consistent before/after add.
- Mobile shell fit/structure:
  - switched app shell to viewport-locked container (`100dvh`) with internal main scroll (`overflow-y-auto`) so header/footer remain fixed delimiters while page content scrolls.
- Branding/logo:
  - removed fallback to `favicon.svg` in in-app `BrandLogo` to avoid wrong emblem appearing in UI fallback chain.
  - added Android launcher icon generation script (`npm run mobile:icons:android`) using the same logo candidate chain (`logo-user.*` first), and wired it into Windows first-time/next-iteration helper flows and bootstrap scripts so APK icons are rebuilt from logo automatically.
- Docs sync:
  - updated README notes to mention launcher icon generation in default helper flow and command list.

Validation:
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run mobile:icons:android` (no-op warning when android resources folder missing, as designed)
- Playwright mobile screenshot captured for recipe form updates.


## 13) Latest Turn Update (preferred unit style and overflow)

User request:
- Keep unit near quantity as placeholder style (`Qté (ml)`) instead of a separate unit badge to save horizontal space.
- Main motivation: avoid horizontal overflow seen in screenshot.

Actions implemented:
- Replaced the recipe ingredient entry row from badge-based unit display to placeholder-based unit display (`Qté (unit)` when ingredient selected).
- Removed explicit separate unit badge from that row.
- Refactored the row layout to a compact grid (`ingredient | qty | +`) with constrained widths and `min-w-0` behavior so small screens do not force horizontal scrolling for this control cluster.

Validation:
- `npm install`
- `npm run typecheck`
- `npm run test`
- Tried Playwright screenshot capture for visual proof; browser container crashed with SIGSEGV in this run (not app logic failure).


## 14) Latest Turn Update (dot-decimal everywhere + scroll behavior)

User reports:
- Some places still show/use comma decimal delimiter instead of dot.
- Some middle sections stayed visually immobile while scrolling, causing overlap; user wants only header/footer fixed and all content between to scroll naturally.

Actions implemented:
- Decimal normalization and dot enforcement:
  - updated `parseOptionalNumber` to normalize commas to dots before numeric parsing (`"," -> "."`).
  - updated shared `Input` component numeric mode to use text-based decimal input with dot normalization on change, `inputMode=decimal`, and decimal pattern so comma input is converted to dot immediately.
  - converted remaining raw numeric fields in recipe/monthly-report flows to dot-friendly text decimal inputs and replaced direct `parseFloat` usage with normalized parser (`parseOptionalNumber(...) ?? 0`).
- Scroll/overlap behavior:
  - downgraded side-form stickiness from always-on to large-screen-only (`lg:sticky lg:top-24`) in Recipes, Orders, Products, Production, ShoppingList, StockManagement to prevent sticky middle blocks on mobile scroll.
  - removed sticky table header inside purchases history in StockManagement to avoid mid-screen overlay during scroll.
  - ensured main content container keeps proper scroll area sizing with `min-h-0` in app shell.

Validation:
- `npm install`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- attempted Playwright screenshot capture; browser container crashed (SIGSEGV), so no fresh screenshot artifact from this turn.


## 15) Latest Turn Update (logo fit/name + CLI error request)

User request:
- Improve launcher logo fit so full image is visible.
- Ask if full app name can be displayed on launcher.
- Fix CLI error shown in screenshot (`Capacitor CLI requires Node >=22`) without reintroducing prior vulnerability/build issues.

Actions implemented:
- Android logo fit:
  - updated `scripts/apply-android-logo.mjs` to generate padded launcher icons (safe margin) so circular/squircle launcher masks are less likely to crop artwork.
- App label visibility:
  - shortened Capacitor app name to `Les Douceurs Miléna` to reduce truncation risk on launchers; documented limitation that Android launchers may still ellipsize labels depending on device grid/width.
- CLI error fix (CI side):
  - updated GitHub Actions CI Node version from 20 to 22 so `npm run mobile:doctor` no longer fails in CI due Capacitor 8 engine requirement.
- Preserved security/baseline decisions:
  - kept Capacitor 8 baseline and no local patch workaround reintroduced.

Validation:
- `node -c scripts/apply-android-logo.mjs`
- `npm install`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run mobile:doctor` (expected fail in current container because runtime node is still 20; CI config now set to Node 22 to avoid this there).
- Playwright screenshot captured for current recipe input UI state.

Important note for user expectation:
- Showing the *entire* app name on home screen cannot be guaranteed from app code alone; launcher UI policy controls ellipsis. Shorter label improves odds but some launchers still truncate.


## 16) Latest Turn Update (app name shortened further)

User request:
- Shorten launcher app name to "Miléna".

Actions taken:
- Updated Capacitor app name to `Miléna` in `capacitor.config.ts`.
- Updated README launcher-label note to reflect the new shorter app name.

Validation:
- `npm run typecheck`


## 17) Latest Turn Update (unsigned release APK)

User report:
- Release build result is `app-release-unsigned.apk`.

Actions taken:
- Added new root helper `windows-sign-release-apk.cmd` to sign `app-release-unsigned.apk` using local keystore (`android\keystores\milena-share.keystore`) and `jarsigner`.
- Updated release one-click flows to auto-run signing helper when unsigned release APK is detected:
  - `windows-first-time-release.cmd`
  - `windows-next-release.cmd`
- Updated README command lists and notes to include the new signing helper and explain automatic signing call in release helpers.

Validation:
- `npm run typecheck`

User outcome expectation:
- After release build, if unsigned APK is produced and keystore exists, script prompts for passwords and creates `android\app\build\outputs\apk\release\app-release-signed.apk`.


## 18) Latest Turn Update (android folder locked during first-time cleanup)

User report:
- First-time script shows cleanup error deleting `android\...\classes.dex` because file is used by another process.

Actions taken:
- Hardened first-time Windows cleanup in both scripts:
  - `windows-first-time-debug.cmd`
  - `windows-first-time-release.cmd`
- New cleanup behavior for `android/`:
  - attempt `gradlew.bat --stop` when available,
  - attempt delete, wait 2 seconds, retry delete once,
  - if still locked, fail early with explicit message to close Android Studio/Gradle/Java processes.
- Updated README troubleshooting note to explain this lock scenario and script behavior.

Validation:
- `npm run typecheck`

## 19) Latest Turn Update (question: existing data vs loading a save)

User question:
- "What happen when the user already have data and then load a save?"

Analysis performed:
- Reviewed current import flow in `App.tsx` (`DataManagerModal.applyImportedData`) and schema parsing in `backupIO.ts`.

Current behavior summary:
- Import is selective by the modal checkboxes (Settings / Catalog / Operations / Reports).
- For each selected section that exists in the imported JSON, current in-app data is replaced for that section.
- Unselected sections are kept unchanged.
- Selected sections that are missing in the file are also left unchanged (no wipe).
- Result can be a mixed dataset (some sections from old data, some from imported file), and then autosave persists that resulting state.

User-facing implication:
- Loading a save does not always do a full reset; it behaves like a partial overwrite according to selection + file contents.

## 20) Latest Turn Update (release install fails: "Application non installée")

User report:
- On release APK install, Android shows "Application non installée".

Actions taken:
- Hardened `windows-sign-release-apk.cmd` signing pipeline:
  - now auto-detects Android SDK build-tools,
  - prefers `apksigner` (modern v1/v2/v3 signatures) instead of only `jarsigner`,
  - runs `zipalign` before signing when available,
  - verifies signature with `apksigner verify`.
- Kept compatibility fallback:
  - if SDK signer tools are unavailable, script falls back to `jarsigner` path.
- Added explicit post-sign guidance in script output and README:
  - if install still fails, uninstall previous/debug app first because different signing keys cannot upgrade each other.

Validation:
- `cmd.exe /c windows-sign-release-apk.cmd` (expected fail in container because Windows cmd/SDK tools unavailable)
- `npm run typecheck`

## 21) Latest Turn Update (mobile storage size + PDF export + default dark mode)

User report/request:
- App appears to consume too much data on Android app storage screen.
- Monthly report PDF button appears to do nothing on phone.
- Dark mode should be enabled by default.

Actions taken:
- Reduced draft-storage bloat risk in `usePersistentState.ts`:
  - draft keys now store metadata (`savedAt`) and support automatic stale cleanup,
  - stale draft entries older than 30 days are pruned automatically,
  - non-draft persistence behavior remains unchanged.
- Reduced duplicate app-data leftovers:
  - in `App.tsx`, when no demo dataset is active, stale demo backup is automatically cleared.
- Dark mode default:
  - app now defaults to dark mode,
  - theme preference is persisted in `localStorage` key `milena_theme`.
- Improved PDF export behavior on mobile in `MonthlyReport.tsx`:
  - prefers native share flow (`navigator.share` with file) when supported,
  - falls back to browser download link,
  - adds explicit alerts for success fallback and errors so action is visible to user.
- Updated `README.md` to document:
  - dark mode default,
  - PDF native-share behavior,
  - draft cleanup to limit mobile storage growth.

Validation:
- `npm run typecheck`
- `npm run test`
- Playwright screenshot captured for mobile viewport (`artifacts/dark-mode-default-mobile.png`).

## 22) Latest Turn Update (apksigner FileNotFoundException on Windows)

User report:
- Release helper prints apksigner info/warnings, then fails with `java.io.FileNotFoundException` in `ApkSigner.sign(...)` and build stops.

Root cause identified:
- In `windows-sign-release-apk.cmd`, `INPUT_APK` was assigned inside a parenthesized block, but consumed as `%INPUT_APK%` in the same block.
- In batch parsing semantics, `%...%` is expanded before runtime inside that block, so path could resolve empty at signing call, causing apksigner file-not-found.

Actions taken:
- Fixed variable expansion by passing `!INPUT_APK!` (delayed expansion) to apksigner sign command.
- Added `JAVA_TOOL_OPTIONS=--enable-native-access=ALL-UNNAMED ...` before apksigner invocation to handle modern Java native-access warnings and future-proof execution.
- Updated README troubleshooting note to clarify these warnings are informational and not the primary failure reason.

Validation:
- `npm run typecheck`

## 23) Latest Turn Update (VAT ingredient model + monthly math hardening + tests/docs)

User request:
- Implement comprehensive VAT ingredient master behavior (HT/TTC basis per ingredient, migration defaults, purchase snapshots, bulk VAT updates).
- Verify and clarify packaging/unsold semantics and add apply-loss-to-packaging toggle.
- Make monthly report status filtering explicit, align delivery handling with "not implemented" path, and extract a pure monthly totals function with strong tests.
- Expand robust pricing/math tests, update in-app guide, add `/docs` formula spec, and add changelog summary.

Actions taken:
- Refactored domain model and calculations:
  - Added ingredient VAT fields (`priceAmount`, `priceBasis`, `vatRate`, `needsVatReview`) and purchase snapshots (`vatRateSnapshot`, `priceBasisSnapshot`).
  - Added settings fields `defaultIngredientVatRate` and `includePendingOrdersInMonthlyReport`.
  - Added product flag `applyLossToPackaging` and applied it in pricing/monthly computations.
  - Introduced conversion helpers (`computeIngredientPrices`, `rebuildIngredientCost`) and switched costing to HT when TVA is active.
  - Kept delivery variable cost out of pricing/report totals (path 1: not implemented in math).
- Implemented migration/normalization flow:
  - Added `dataMigrations.ts` and integrated normalization in app load and settings updates.
  - Legacy ingredients in TVA mode are auto-defaulted and flagged for review.
- Updated UI copy and behavior:
  - Settings TVA helper text now matches explicit franchise/TVA-active messaging.
  - Added default ingredient TVA input and pending-orders monthly toggle.
  - Stock/ingredient screen now supports VAT basis/rate, computed HT/TTC display, review warning, purchase VAT snapshot capture, and a bulk VAT update action.
  - Products screen includes toggle "apply manufacturing loss to packaging" (default OFF).
  - User Guide includes a TVA section with numeric examples.
- Monthly report math extraction:
  - Added pure function module `monthlyReportMath.ts` and wired `MonthlyReport.tsx` to use it.
  - Added explicit order inclusion helper (`shouldIncludeOrder`) used by report prefill warnings.
- Documentation:
  - Added `docs/formulas-spec.md`.
  - Added `CHANGELOG.md` in Keep a Changelog structure.

Validation:
- `npm run typecheck`
- `npm test`
- `npm run build`
- Playwright screenshot captured: `browser:/tmp/codex_browser_invocations/13dc97af8807cae4/artifacts/artifacts/home.png`

## 24) Latest Turn Update (follow-up fixes: fixed-cost TVA UX + purchase HT/TTC basis)

User feedback:
- Asked to confirm TVA is not auto-applied to fixed costs; requested removing the "HT" suffix in fixed-cost add box and replacing with short guidance note.
- Requested in "Journal des achats" and "Stocks & prix moyens" that, when TVA is ON, user can choose whether purchase prices are entered TTC or HT, and tables should show HT values (with TTC in parentheses).

Actions taken:
- Updated fixed-cost UX in Settings:
  - removed "HT" suffix from "Ajouter une charge" title,
  - added short explanatory note when TVA is ON.
- Updated purchases flow in StockManagement:
  - added per-purchase selector "Prix saisi en: TTC | HT" (visible only when TVA ON),
  - purchase snapshots now keep selected basis and ingredient VAT rate.
- Updated purchases/history and stock-analysis displays:
  - in TVA mode, show HT as primary with TTC in parentheses for total and unit purchase prices,
  - in stock-analysis tables, show last/average purchase prices in HT with TTC in parentheses,
  - standard-price update actions now use HT purchase-derived values for consistency.
- Updated docs:
  - `docs/formulas-spec.md` now explicitly states fixed costs are not auto-converted HT/TTC,
  - `README.md` synchronized with the same rule.

Validation:
- `npm run typecheck`
- `npm test`
- Playwright screenshots:
  - `browser:/tmp/codex_browser_invocations/a51c8c259d22d2ac/artifacts/artifacts/settings-fixed-cost-note.png`
  - `browser:/tmp/codex_browser_invocations/a51c8c259d22d2ac/artifacts/artifacts/purchases-vat-basis.png`

## 25) Latest Turn Update (consistency fix: Prix Standard column HT label)

User feedback:
- Requested consistency in stock analysis table: "Prix Standard (Fiche)" should also clearly be shown as HT in TVA mode, matching other columns.

Actions taken:
- Updated `components/views/StockManagement.tsx` so the "Prix Standard (Fiche)" value now shows `HT` suffix when TVA is ON, while keeping TTC in parentheses below.

Validation:
- `npm run typecheck`
- `npm test`
- Playwright screenshot captured:
  - `browser:/tmp/codex_browser_invocations/af7e4bdd9ea09f13/artifacts/artifacts/stock-prix-standard-ht.png`

## 26) Latest Turn Update (pricing/packaging/reporting verification + comprehensive tests)

User request:
- Verify packaging/unsold/manufacturing-loss semantics and add tests.
- Verify monthly report correctness (order filtering, delivery consistency, labor toggle vs prefill).
- Extract monthly report computations to pure function and unit-test thoroughly.
- Add core pricing math tests (conversions, recipes, metrics, monotonicity).
- Create complete `docs/formulas-spec.md` and update `CHANGELOG.md`.

Verification findings:
- `packagingUsedOnUnsold` (per-product boolean) — confirmed working in both `calculateProductMetrics` and `computeMonthlyTotals`.
- `applyLossToPackaging` (per-product boolean, default OFF) — confirmed working in both pricing and monthly report.
- Order filtering (`shouldIncludeOrder`) — confirmed: completed always included, cancelled always excluded, pending excluded by default (toggle in settings).
- `computeMonthlyTotals` — already extracted as pure function in `monthlyReportMath.ts`.

Bugs found and fixed:
- **Monthly report price prefill** always included labor regardless of `includeLaborInCost` toggle → fixed to respect the toggle.
- **Monthly report price prefill** included `variableDeliveryCost` while all calculations forced it to 0 → removed from prefill.

Actions taken:
- Fixed `MonthlyReport.tsx` price prefill (labor toggle + delivery removal).
- Expanded `tests/utils.test.ts` from 7 to 43 tests covering: unit conversions (all unit types, invalid inputs), ingredient HT/TTC conversions, recipe material cost (multi-ingredient, missing ingredient, loss), product metrics (labor toggle, loss rate, unsold, packaging ON/OFF, loss-to-packaging ON/OFF, fixed cost allocation, VAT pricing, social charges, monotonicity).
- Expanded `tests/monthlyReportMath.test.ts` from 4 to 25 tests covering: order status filtering, VAT ON/OFF split, social contributions base, packaging logic (unsold + loss), cost modes, net result, multi-product, edge cases.
- Rewrote `docs/formulas-spec.md` with complete exact formulas for all calculations.
- Updated `CHANGELOG.md` with fixes, new tests, and expanded scope summary.

Validation:
- `npm run typecheck` — clean
- `npm test` — 91 tests pass (up from 34)
- `npm run build` — not run (tests + typecheck sufficient)

## 27) Latest Turn Update (remove all delivery cost references + context update)

User request:
- Remove ALL mentions of delivery cost from the entire codebase.
- Update PROJECT_AGENT_CONTEXT.md with current context.

Actions taken:
- Removed `variableDeliveryCost` field from `Product` interface in `types.ts`.
- Removed `variableDeliveryCost` from both strict and legacy product schemas in `dataSchema.ts`.
- Removed `finalDeliveryCost` variable and references from `utils.ts` calculations.
- Removed `variableDeliveryCost` from all initial/default product data in `utils.ts`.
- Removed all delivery validation, default values, and form handling from `components/views/Products.tsx`.
- Removed delivery comment from `components/views/MonthlyReport.tsx`.
- Removed `variableDeliveryCost` from all 3 demo datasets in `demoData.ts`.
- Removed delivery section from `docs/formulas-spec.md`.
- Removed delivery scope line from `README.md`.
- Updated `CHANGELOG.md` to note field removal instead of "not implemented".
- Removed delivery test sections from `tests/utils.test.ts` and `tests/monthlyReportMath.test.ts`.
- Removed `variableDeliveryCost` from test fixtures in `tests/products.test.tsx`, `tests/importSchema.test.ts`, and `tests/backupIO.test.ts`.
- Note: `tests/fixtures/proof-save.json` and `patch.patch` / `.html` build artifacts were NOT modified (backward-compat fixture + generated files).
- Note: "livraison" references in `Orders.tsx` (order delivery date label) were NOT removed as they refer to order delivery dates, not delivery cost.

Validation:
- `npx tsc --noEmit` — clean (no type errors)
- `npx vitest run` — 89 tests pass (2 delivery tests removed from prior 91)

Files modified:
- `types.ts`, `dataSchema.ts`, `utils.ts`, `demoData.ts`, `dataMigrations.ts` (no change needed)
- `components/views/Products.tsx`, `components/views/MonthlyReport.tsx`
- `tests/utils.test.ts`, `tests/monthlyReportMath.test.ts`, `tests/products.test.tsx`, `tests/importSchema.test.ts`, `tests/backupIO.test.ts`
- `docs/formulas-spec.md`, `CHANGELOG.md`, `README.md`, `PROJECT_AGENT_CONTEXT.md`

## 28) Latest Turn Update (strict equality assertion framework + artifact cleanup)

User request:
- Always update PROJECT_AGENT_CONTEXT.md after every turn (standing instruction).
- Enforce strict equalities in all tests — replace all `toBeCloseTo` with exact comparisons.
- Implement a validation framework that supports configurable tolerance, with tolerance set to strict (zero) for now.
- Delete `patch.patch` and `Check and apply patch.patch file.html` artifact files.

Actions taken:
- Created `tests/assertHelpers.ts` — validation framework with:
  - `NUMERIC_TOLERANCE` constant (set to `0` for strict mode),
  - `expectEqual(actual, expected, tolerance?)` helper: uses `toBe` (===) when tolerance is 0, absolute-difference check when > 0.
- Rewrote `tests/utils.test.ts` — replaced all 35 `toBeCloseTo` calls with `expectEqual`, expressing expected values as exact arithmetic expressions matching the code's computation path (e.g., `100 * 0.01 / 10` instead of literal `0.1`).
- Rewrote `tests/monthlyReportMath.test.ts` — replaced all 28 `toBeCloseTo` calls with `expectEqual`, using arithmetic expressions that mirror the production code.
- Fixed one IEEE 754 subtraction-accumulation mismatch in `packagingUsedOnUnsold ON` test: replaced difference-based check with direct verification of `totalVariableCosts` against computed expected.
- Kept relational assertions (`toBeGreaterThan`, `toBeGreaterThanOrEqual`, `toBeLessThan`) as native Vitest calls — these test monotonicity properties, not specific values.
- Deleted `patch.patch` and `Check and apply patch.patch file.html` build artifacts.
- Fixed blank lines left by linter in `demoData.ts` after prior delivery-cost removal.

Validation:
- `npx tsc --noEmit` — clean
- `npx vitest run` — 89 tests pass (all strict equality)

Files modified:
- `tests/assertHelpers.ts` (new)
- `tests/utils.test.ts`, `tests/monthlyReportMath.test.ts`
- `demoData.ts` (cosmetic blank-line fix)
- `PROJECT_AGENT_CONTEXT.md`

Files deleted:
- `patch.patch`
- `Check and apply patch.patch file.html`
