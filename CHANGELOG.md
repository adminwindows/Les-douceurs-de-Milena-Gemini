# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]
### Fixed
- Monthly report price prefill now respects `includeLaborInCost` toggle (was always including labor).
- Monthly report price prefill no longer includes `variableDeliveryCost` (delivery is not implemented).

### Added
- Comprehensive unit tests for `computeMonthlyTotals`: VAT ON/OFF split, social contributions base, packaging logic (unsold + loss rule), order status filtering, delivery handling, cost modes, net result, multi-product, edge cases.
- Comprehensive unit tests for `calculateProductMetrics`: labor toggle, lossRate, unsoldEstimate, packagingUsedOnUnsold ON/OFF, applyLossToPackaging ON/OFF, fixed cost allocation, VAT ON/OFF for minimum price, social charges, delivery not-implemented, monotonicity.
- Comprehensive unit tests for `convertToCostPerBaseUnit`: all unit types (kg, L, g, ml, pièce), non-1 purchase quantities, invalid inputs (0, negative, NaN, Infinity).
- Comprehensive unit tests for `computeIngredientPrices`: TTC/HT conversions, 0% VAT edge case.
- Comprehensive unit tests for `calculateRecipeMaterialCost`: multi-ingredient, missing ingredient, empty recipe, lossPercentage.
- Comprehensive unit tests for `shouldIncludeOrder`: completed/cancelled/pending with toggle ON/OFF.
- Expanded `docs/formulas-spec.md` with exact formulas for all calculations: ingredient costing, recipe cost, product metrics, minimum price, monthly report totals, rounding strategy.
- TVA ingredient model in master data (`vatRate`, `priceBasis`, `priceAmount`) with automatic HT/TTC conversion.
- Purchase VAT snapshot fields for historical stability.
- Bulk VAT rate update action in ingredient definitions.
- Per-product toggle to apply manufacturing-loss multiplier to packaging.
- Pure monthly computation function (`computeMonthlyTotals`) for unit testing.

### Changed
- Monthly report order filtering now excludes pending by default (option available in settings).
- Delivery variable costs are treated as not implemented in pricing/reporting calculations.
- Settings and in-app guide copy clarified for micro-enterprise TVA flows.

### Existing product scope summary
- **Catalog**: ingredient master data (with per-ingredient VAT rate and price basis), recipes (with batch yield and loss percentage), products (with packaging, loss rate, unsold estimate).
- **Pricing/costing**: material cost from recipes, labor toggle (`includeLaborInCost`), fixed costs allocation across products, manufacturing loss multiplier, unsold handling, target margins, social charges divisor.
- **Orders/operations**: customer orders (pending/completed/cancelled), production batches, purchase journal, stock management.
- **Monthly reporting**: 3 cost modes (calculated/actual spend/inventory variation), revenue HT/TTC split, social charges on HT base, packaging with unsold + loss toggles, archived reports with lock + PDF export.
- **Data safety**: JSON backup/import/export with selective options, 3 demo datasets, versioned storage with migrations.
- **Mobile packaging**: Capacitor Android/iOS setup with helper scripts for APK build and signing.
