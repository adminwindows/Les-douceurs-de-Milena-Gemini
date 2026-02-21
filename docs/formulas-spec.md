# Formules de calcul (spécification)

## 1) Ingrédients et recettes

### Coût unitaire ingrédient

`costPerBaseUnit = price / (quantity * multiplier)`

- `multiplier = 1000` pour `kg` et `L` (conversion vers g/ml), sinon `1`.
- Les prix ingrédients sont stockés en base unique (pas de TVA par ingrédient).

### Coût batch recette

`batchCost = Σ(quantityRecipeIngredient * ingredient.costPerBaseUnit) * (1 + recipe.lossPercentage/100)`

### Coût matière unitaire recette

`unitMaterialCost = batchCost / batchYield`

---

## 2) Coût produit

### Multiplicateur perte fabrication

`mfgLoss = 1 / (1 - product.lossRate/100)`

### Ratio matière (vendus + invendus estimés)

`materialRatio = (estimatedMonthlySales + unsoldEstimate) / estimatedMonthlySales`

### Matière finale par unité vendue

`finalMaterialCost = unitMaterialCost * mfgLoss * materialRatio`

### Emballage final par unité vendue

`packagingUnits = estimatedMonthlySales + (packagingUsedOnUnsold ? unsoldEstimate : 0)`

`packagingRatio = packagingUnits / estimatedMonthlySales`

`packagingLoss = applyLossToPackaging ? mfgLoss : 1`

`finalPackagingCost = packagingCost * packagingRatio * packagingLoss`

### Charges fixes allouées

`allocatedFixedCost = totalFixedCosts / totalEstimatedVolume` (si volume > 0, sinon 0)

### Coût complet

`fullCost = finalMaterialCost + finalPackagingCost + allocatedFixedCost`

---

## 3) Prix (marge vs salaire)

`divisor = 1 - taxRate/100`

### Prix minimum (inchangé)

`minPriceHT = fullCost / divisor`

`minPriceTTC = isTvaSubject ? minPriceHT * (1 + defaultTvaRate/100) : minPriceHT`

### Mode Marge cible

`priceMarginHT = (fullCost + targetMargin) / divisor`

`priceMarginTTC = isTvaSubject ? priceMarginHT * (1 + defaultTvaRate/100) : priceMarginHT`

### Mode Salaire cible

`allocatedSalaryPerUnit = targetMonthlySalary / totalEstimatedVolume` (si volume > 0, sinon 0)

`priceSalaryHT = (fullCost + allocatedSalaryPerUnit) / divisor`

`priceSalaryTTC = isTvaSubject ? priceSalaryHT * (1 + defaultTvaRate/100) : priceSalaryHT`

---

## 4) Commandes

- Chaque ligne commande stocke `quantity` + `price`.
- Chaque commande stocke un seul `tvaRate`.
- Ce `tvaRate` n’altère pas `price`; il sert à la décomposition HT/TVA du bilan.

---

## 5) Bilan mensuel

## 5.1 Lignes de ventes et invendus

- Ventes: `MonthlyEntry[]` (`productId`, `quantitySold`, `actualPrice`, `tvaRate?`).
- Invendus: `UnsoldEntry[]` (`productId`, `quantityUnsold`), section séparée.

## 5.2 Chiffre d’affaires

`totalRevenueTTC = Σ(quantitySold * actualPrice)`

Pour chaque ligne de vente:

- si `tvaRate > 0`: `lineHT = lineTTC / (1 + tvaRate/100)`
- sinon: `lineHT = lineTTC`

`totalRevenueHT = Σ(lineHT)`

`totalTvaCollected = totalRevenueTTC - totalRevenueHT`

## 5.3 Coûts matière (3 modes)

- Mode `0` (théorique): calcul recette sur `(sold + unsold)` par produit.
- Mode `1` (factures): `finalFoodCost = actualIngredientSpend`.
- Mode `2` (variation stock): `finalFoodCost = inventoryVariationCost`.

En mode théorique, base prix ingrédient sélectionnable:

- `average` = prix moyen lissé des achats.
- `last` = dernier prix d’achat.

## 5.4 Emballage mensuel

Par produit:

`packagingUnits = sold + (packagingUsedOnUnsold ? unsold : 0)`

`packagingCost = product.packagingCost * packagingUnits * (applyLossToPackaging ? mfgLoss : 1)`

## 5.5 Cotisations et résultat

`totalSocialCharges = totalRevenueHT * (taxRate/100)`

`grossMargin = totalRevenueHT - (finalFoodCost + totalPackagingCost + totalSocialCharges)`

`netResult = grossMargin - actualFixedCosts`

---

## 6) Historique figé

- Lorsqu’un bilan sauvegardé est rechargé, ses lignes chargées sont figées.
- Les ajouts ultérieurs sont calculés séparément puis additionnés aux totaux figés sauvegardés.
