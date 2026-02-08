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

## Data Persistence

* The app auto-saves data to your browser's local storage.
* Use the “Sauvegardes / Données” modal to export or import a JSON backup.
* Storage is abstracted behind a storage engine interface (web localStorage default) with runtime bootstrap support for injecting native mobile adapters.


## Current Functional Scope

The application currently includes:

* **Catalog management**: ingredients, recipes, and sellable products with validation.
* **Costing & pricing analytics**: variable costs, labor toggle, fixed-cost allocation, margin targets, TVA-aware pricing, and alternate purchase-price analysis modes.
* **Operations flow**: customer orders, shopping list generation, production batch logging, and stock/purchase tracking.
* **Monthly reporting**: report archiving with inventory-variation and spend-based costing options.
* **Data safety**: local autosave, selective import/export backup, and a reversible **Mode Démo** (multiple sample datasets + safe restore of original user data on exit).
* **Quality tooling**: Vitest test suite, typecheck script, and CI workflow for automated checks.
