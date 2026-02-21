# Changelog

All notable changes to this project are documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]
### Added
- New pricing mode selector in Analysis: `Marge cible` vs `Salaire cible`.
- Salary helper (in margin mode) to estimate units to sell per product mix to hit a monthly salary target.
- Product `standardPrice` support and order-line price prefill from standard price.
- One TVA rate per order, persisted and reused in monthly report grouping.
- Monthly report split between `Ventes` and `Invendus` sections.
- Monthly report support for duplicate sale lines of same product (different price / TVA rate).
- Monthly report theoretical ingredient price source selector: `Prix moyen lissé` or `Dernier prix`.
- Frozen-history behavior for loaded saved reports with additive new lines.
- Expanded monthly report saved totals payload (`TTC/HT/TVA/cost buckets`) for stable re-open behavior.

### Changed
- TVA model simplified to global-only settings (`isTvaSubject` + `defaultTvaRate`), no per-product TVA field.
- Labor-cost settings/fields removed from pricing formulas and UI.
- Product metrics now compute minimum price + margin recommendation + salary recommendation in parallel.
- Orders model now stores per-item sell price and order-level TVA rate.
- Monthly report math now consumes separate `sales` + `unsold` arrays.
- Demo datasets updated to new schema (settings/products/orders).
- User guide and formulas documentation updated to match the redesign.

### Removed
- Per-product TVA field.
- Labor-time/hourly-rate/include-labor pricing controls.
- Legacy ingredient migration flags tied to old price-basis model.
