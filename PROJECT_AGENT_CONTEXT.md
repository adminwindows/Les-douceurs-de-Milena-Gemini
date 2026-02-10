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
