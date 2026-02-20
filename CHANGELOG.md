# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]
### Added — Heavy Pricing & Reporting Redesign
- **Pricing modes**: replaced `includeLaborInCost` toggle with `pricingMode: 'margin' | 'salary'` enum and `salaryTarget` field.
  - **Margin mode**: labor included in cost, per-product `targetMargin`.
  - **Salary mode**: labor excluded from cost, effective margin = `salaryTarget / totalEstimatedVolume`.
- **Salary simulator** (`simulateMonthlySalary`): computes achievable monthly net salary from current standardPrices, volumes, and costs. Displayed in Analysis tab.
- **Standard price** (`product.standardPrice`): user-defined selling price per product. Used as default in orders and monthly report.
- **Separated report lines**: monthly report data model uses `SaleLine[]` + `UnsoldLine[]` instead of combined `MonthlyEntry[]`.
- **Frozen report totals** (`FrozenReportTotals`): saved reports snapshot all computed totals at save time, immune to later catalog changes.
- **Order TVA snapshot**: `Order.isTvaSubject` and `OrderItem.unitPrice` capture state at creation time.
- **Per-line TVA snapshot**: each `SaleLine` can carry its own `isTvaSubject` for historical accuracy.
- **Ingredient price mode** on monthly reports: tracks which price basis (standard/average/last) was used.
- Pricing mode radio cards in Settings (replacing labor toggle).
- Salary target input (visible in salary mode).
- Salary simulator display in Analysis.
- Pricing modes section in User Guide (advanced tab).
- Updated all 3 demo datasets to new type shapes.

### Changed
- **Global TVA rate**: removed per-product `tvaRate`, now uses only `settings.defaultTvaRate` for all products.
- Monthly report data model migrated from `sales: MonthlyEntry[]` to `saleLines: SaleLine[]` + `unsoldLines: UnsoldLine[]`.
- `calculateProductMetrics` returns `calculatedLaborCost` (always) and `effectiveMargin` (mode-dependent).
- Settings UI: pricing mode radio cards replace `includeLaborInCost` checkbox.
- Orders: snapshot `unitPrice` (from standardPrice) and `isTvaSubject` on save.
- Demo data: updated to use `pricingMode`/`salaryTarget`, removed per-product `tvaRate`.

### Migration (backward compatibility)
- `normalizeSettings`: converts legacy `includeLaborInCost` to `pricingMode: 'margin'`.
- `normalizeProduct`: drops per-product `tvaRate`, preserves `standardPrice`.
- `normalizeReport`: converts legacy `sales: MonthlyEntry[]` to `saleLines` + `unsoldLines`.
- Import schema accepts both old and new field shapes.

### Fixed
- Monthly report price prefill now uses `calculateProductMetrics` for exact consistency with Analysis.

### Existing product scope summary
- **Catalog**: ingredient master data (price always HT), recipes (with batch yield and loss percentage), products (with packaging, loss rate, unsold estimate, standardPrice).
- **Pricing/costing**: material cost from recipes, pricing modes (margin/salary), fixed costs allocation across products, manufacturing loss multiplier, unsold handling, effective margins, social charges divisor, salary simulator.
- **Orders/operations**: customer orders (pending/completed/cancelled) with TVA/price snapshots, production batches, purchase journal, stock management.
- **Monthly reporting**: separated SaleLine/UnsoldLine model, 3 cost modes (calculated/actual spend/inventory variation), revenue HT/TTC split with per-line TVA snapshots, social charges on HT base, packaging with unsold + loss toggles, frozen report totals, archived reports with lock + PDF export.
- **Data safety**: JSON backup/import/export with selective options, 3 demo datasets, versioned storage with migrations.
- **Mobile packaging**: Capacitor Android/iOS setup with helper scripts for APK build and signing.
