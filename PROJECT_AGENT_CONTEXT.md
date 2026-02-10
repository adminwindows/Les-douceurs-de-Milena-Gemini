# Project Agent Context (Persistent Handoff)

> Purpose: give any new agent full continuity of this project and user expectations.
> Update this file **after every user request** so context stays current.

## 1) User Profile & Working Preferences

- User is beginner-friendly and wants explanations in clear, practical steps.
- User strongly prefers Windows-first operational guidance (CMD/PowerShell), then cross-platform notes.
- User wants concrete, copy/paste commands and one-click flows over abstract advice.
- User asks for robust proof/validation (tests, screenshots when relevant, exact outputs/paths).
- User wants documentation updated whenever behavior/features change.
- User does NOT want long answer dumps moved into repo docs/files when the answer should be in chat.
- User prefers meaningful branch names and clean, practical workflows.
- User is sensitive to regressions and stale branch states; explicit reset/sync steps are valued.
- User requested root-level clickable `.cmd` helpers (not hidden in `scripts/`) and persistent CMD windows (`pause`).

## 2) Product Domain & Core App Goals

The app is a bakery management/costing tool (Les douceurs de Miléna) with:
- ingredients/recipes/products,
- orders/production/stocks/purchases,
- pricing/analysis,
- monthly reporting,
- backups/import/export,
- demo mode,
- mobile packaging path (Capacitor).

User’s long-term priorities:
1. Data safety and reliability.
2. Practical UX for real-world bakery workflows.
3. Correct numerical outputs with testable evidence.
4. Easy Android APK generation without store publication.

## 3) Major Historical Requests Already Made

### A) Reliability / validation / tests / CI
- Strengthen input validation behavior.
- Avoid silent clamping/overrides where not desired.
- Expand tests and CI checks.

### B) Data compatibility and import robustness
- Support older save formats and wrapped JSON/BOM edge cases.
- Preserve schema validation while improving parser robustness.
- Provide proof a specific user-provided dataset imports correctly.

### C) Feature requests
- Production recipe card with scaled ingredient quantities.
- Product edit flow from product cards.
- Include-labor-in-cost toggle behavior and UI.
- Demo mode with reversible state restore and no unintended persistence.
- First launch should start empty business data.

### D) QA/proof expectations
- Explore app like a real user.
- Cross-check pricing/monthly report calculations independently.
- Provide screenshot evidence where possible.

### E) Mobile path
- Move toward Android/iOS app packaging via Capacitor.
- Keep first launch empty and subsequent launches persistent.
- Manual backup/import should remain user-controlled.
- User mainly wants installable APK/IPA behavior (no immediate store publication).

### F) UX/content specifics requested previously
- Improve mobile fit/layout.
- Replace ambiguous confirmation labels with explicit Oui/Non semantics.
- Improve monthly report actions when print does nothing on phone.
- Add bakery branding/logo in relevant locations.

## 4) Current Implemented State (as of this handoff)

- Bakery logo assets exist (`public/logo-milena.svg`, `public/favicon.svg`).
- `BrandLogo` component exists and is used in app shell/report.
- Monthly report includes PDF export flow (`pdf-lib`).
- Orders delivery flow uses in-app Oui/Non modal (no browser confirm text ambiguity).
- Windows helper `.cmd` files are intended to be in repo root and persistent via `pause`.
- README includes Windows quick-start, first-time vs next-iteration flows, release key creation, and logo-generation rationale.

## 5) Windows Build Helpers Expected at Repo Root

Expected root files:
- `windows-first-time-debug.cmd`
- `windows-first-time-release.cmd`
- `windows-next-debug.cmd`
- `windows-next-release.cmd`
- `windows-create-release-key.cmd`

Expected behavior:
- double-clickable from root,
- stop on errors,
- keep window open at end (`pause` on success/failure).

## 6) User’s Latest New Requests (Current Turn)

1. Fix the mobile scaffold failure shown in screenshot (`cap doctor` failing due Node >=22 requirement).
2. Make the mobile helper flow work with the current environment and stop blocking on that version mismatch.

## 7) Update Protocol For Future Agents

After each request:
1. Update this file with:
   - what user asked,
   - what changed,
   - what remains open,
   - any preference adjustments.
2. Keep Windows commands and script locations synchronized with README.
3. Re-run relevant checks (`test`, `typecheck`, optionally `build`) and note results.

## 8) Open Risks / Attention Points

- Browser-container screenshot runs can intermittently fail (infra instability); retry may be needed.
- Capacitor/Android toolchain depends on local machine env (`ANDROID_HOME`, JDK version, SDK presence).
- Release APK signing still requires local keystore + Gradle signing config (not store credentials).

## 9) Latest Update (Current Turn)

- Downgraded Capacitor packages from v8 to v7.4.x in `package.json` so CLI no longer requires Node 22+ and works on Node 20 environment.
- Updated bootstrap scripts and README prerequisites from Node 22+ to Node 20+ with Capacitor 7+ wording.
- Regenerated `package-lock.json` via `npm install` and validated the fix with `npm run mobile:doctor` (now passes).
- Re-ran `npm run typecheck` and `npm run test` successfully after dependency change.
