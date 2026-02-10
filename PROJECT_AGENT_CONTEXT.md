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
