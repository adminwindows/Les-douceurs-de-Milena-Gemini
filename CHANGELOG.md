# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]
### Added
- TVA ingredient model in master data (`vatRate`, `priceBasis`, `priceAmount`) with automatic HT/TTC conversion.
- Purchase VAT snapshot fields for historical stability.
- Bulk VAT rate update action in ingredient definitions.
- Per-product toggle to apply manufacturing-loss multiplier to packaging.
- Pure monthly computation function (`computeMonthlyTotals`) for unit testing.
- New documentation: `docs/formulas-spec.md`.

### Changed
- Monthly report order filtering now excludes pending by default (option available in settings).
- Delivery variable costs are treated as not implemented in pricing/reporting calculations.
- Settings and in-app guide copy clarified for micro-enterprise TVA flows.

### Existing product scope summary
- Catalog: ingredient master, recipes, products.
- Pricing/costing: material, labor toggle, fixed costs allocation, losses, margins.
- Orders/operations: orders, production, purchases, stock analysis.
- Monthly reporting: revenue HT/TTC, social charges, variable + fixed costs, archived reports + PDF.
- Data safety: backup/import/export and demo datasets.
- Mobile packaging: Capacitor Android/iOS setup and helper scripts.
