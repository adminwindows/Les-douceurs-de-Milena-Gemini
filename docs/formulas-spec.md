# Formules de calcul (spécification)

## 1. Coût matière recette

### Coût par unité de base d'un ingrédient

```
costPerBaseUnit = prix_utilisé / (quantité_achetée × multiplicateur)
```

- **multiplicateur** = 1000 si l'unité est `kg` ou `L` (conversion en g ou ml), sinon 1 (g, ml, pièce).
- **prix_utilisé** : voir section TVA ci-dessous.
- Si `quantité_achetée ≤ 0` ou prix invalide (NaN, Infinity) → `costPerBaseUnit = 0`.

### Coût batch recette

```
coût_batch_brut = Σ (quantité_ingrédient_recette × costPerBaseUnit_ingrédient)
coût_batch = coût_batch_brut × (1 + lossPercentage / 100)
```

- Les ingrédients manquants (ID introuvable) sont ignorés (contribution = 0).
- `lossPercentage` est le pourcentage de perte recette (perte de préparation, chutes).

### Coût matière unitaire

```
unitMaterialCost = coût_batch / batchYield
```

- `batchYield` = nombre d'unités produites par batch (minimum 1 par défaut).

---

## 2. Ingrédients et TVA

### Règle selon le statut TVA global (`settings.isTvaSubject`)

- **Franchise TVA (OFF)** : le coût matière utilise `priceAmount` tel que saisi (TTC payé = coût réel).
- **Assujetti TVA (ON)** : le coût matière utilise toujours `priceHT`.

### Conversions HT ↔ TTC

```
vatMultiplier = 1 + vatRate / 100

Si priceBasis === 'TTC':
  priceHT  = priceAmount / vatMultiplier
  priceTTC = priceAmount

Si priceBasis === 'HT':
  priceHT  = priceAmount
  priceTTC = priceAmount × vatMultiplier
```

- Chaque ingrédient possède son propre `vatRate` et `priceBasis`.
- Si `vatRate = 0` alors `priceHT = priceTTC = priceAmount`.

---

## 3. Coûts produit (par unité vendue)

### Multiplicateur de perte fabrication

```
manufacturingLossMultiplier = 1 / (1 - lossRate / 100)
```

- `lossRate` = pourcentage de perte fabrication (produits cassés, ratés).
- Exemple : 10% → multiplicateur ≈ 1,1111.

### Ratio production matière (invendus)

```
materialProductionRatio = (estimatedMonthlySales + unsoldEstimate) / estimatedMonthlySales
```

### Coût matière final (par unité vendue)

```
finalMaterialCost = unitMaterialCost × manufacturingLossMultiplier × materialProductionRatio
```

### Emballage

```
packagingQuantity = estimatedMonthlySales + (packagingUsedOnUnsold ? unsoldEstimate : 0)
packagingRatio = packagingQuantity / estimatedMonthlySales
packagingLossMultiplier = applyLossToPackaging ? manufacturingLossMultiplier : 1
finalPackagingCost = packagingCost × packagingLossMultiplier × packagingRatio
```

- `packagingUsedOnUnsold` (boolean, par produit) : si ON, les invendus sont aussi emballés.
- `applyLossToPackaging` (boolean, par produit, défaut OFF) : si ON, le multiplicateur de perte s'applique aussi à l'emballage.

### Livraison variable

```
finalDeliveryCost = 0  (non implémenté)
```

- Le champ `variableDeliveryCost` existe dans le modèle produit mais est forcé à 0 dans tous les calculs (pricing et bilan mensuel). Non inclus dans les prix suggérés.

### Main d'œuvre

```
calculatedLaborCost = (laborTimeMinutes / 60) × hourlyRate
laborCost = includeLaborInCost ? calculatedLaborCost : 0
```

- `includeLaborInCost` (toggle global dans Settings, défaut ON).
- Le prix suggéré du bilan mensuel respecte ce toggle.

### Charges fixes allouées

```
totalEstimatedVolume = Σ (estimatedMonthlySales de chaque produit)
totalFixedCosts = Σ (montant de chaque poste de charge fixe)
allocatedFixedCost = totalEstimatedVolume > 0 ? totalFixedCosts / totalEstimatedVolume : 0
```

- Les charges fixes sont réparties uniformément par unité estimée vendue sur l'ensemble des produits.
- Les montants sont utilisés tels que saisis (pas de conversion HT/TTC automatique).

### Coûts variables totaux

```
totalVariableCosts = finalMaterialCost + finalPackagingCost + finalDeliveryCost
```

### Coût complet

```
fullCost = totalVariableCosts + laborCost + allocatedFixedCost
```

---

## 4. Prix minimum / prix suggéré

### Diviseur social

```
socialRateDecimal = taxRate / 100
divisor = 1 - socialRateDecimal
```

- `taxRate` = taux de cotisations sociales (ex: 22% pour micro-entreprise BIC).

### Prix minimum de rentabilité

```
minPriceBreakevenHT = fullCost / divisor
```

### Prix avec marge

```
priceWithMarginHT = (fullCost + targetMargin) / divisor
```

### Conversion TTC (si TVA activée)

```
tvaRate = product.tvaRate ?? settings.defaultTvaRate

Si isTvaSubject:
  minPriceBreakevenTTC = minPriceBreakevenHT × (1 + tvaRate / 100)
  priceWithMarginTTC = priceWithMarginHT × (1 + tvaRate / 100)
Sinon:
  TTC = HT (pas de majoration)
```

---

## 5. Bilan mensuel

### Inclusion des commandes

- **Par défaut** : seules les commandes `completed` sont comptées.
- Les commandes `cancelled` sont **toujours exclues**.
- Toggle `includePendingOrdersInMonthlyReport` (Settings, défaut OFF) : si ON, les commandes `pending` sont aussi incluses.

### Chiffre d'affaires

```
totalRevenueTTC = Σ (quantitySold × actualPrice)

Si TVA activée:
  Pour chaque ligne de vente:
    tvaRate = product.tvaRate ?? settings.defaultTvaRate
    lineHT = lineTTC / (1 + tvaRate / 100)
  totalRevenueHT = Σ lineHT
  totalTvaCollected = totalRevenueTTC - totalRevenueHT

Si franchise TVA:
  totalRevenueHT = totalRevenueTTC
  totalTvaCollected = 0
```

### Coût matière (3 modes)

- **Mode 0 (Calculé)** : basé sur les recettes.
  ```
  Pour chaque produit vendu:
    batchCost = calculateRecipeMaterialCost(recipe, ingredients)
    unitCost = batchCost / batchYield
    mfgLossMultiplier = 1 / (1 - lossRate / 100)
    foodCost += unitCost × mfgLossMultiplier × (quantitySold + quantityUnsold)
  ```
- **Mode 1 (Dépenses réelles)** : utilise `actualIngredientSpend` saisi.
- **Mode 2 (Variation de stock)** : utilise la variation d'inventaire calculée.

### Emballage dans le bilan

```
Pour chaque produit:
  packagingUnits = quantitySold + (packagingUsedOnUnsold ? quantityUnsold : 0)
  mfgLossMultiplier = 1 / (1 - lossRate / 100)
  packagingLossMultiplier = applyLossToPackaging ? mfgLossMultiplier : 1
  totalPackagingCost += packagingCost × packagingUnits × packagingLossMultiplier
```

### Cotisations sociales

```
baseForSocialCharges = totalRevenueHT  (HT si TVA, sinon total TTC)
totalSocialCharges = baseForSocialCharges × (taxRate / 100)
```

### Résultat net

```
totalVariableCosts = finalFoodCost + totalPackagingCost + totalSocialCharges
grossMargin = totalRevenueHT - totalVariableCosts
netResult = grossMargin - actualFixedCosts
```

---

## 6. Arrondis

- **Calculs internes** : flottants sans arrondi intermédiaire.
- **Arrondi uniquement à l'affichage** : format monnaie (2 décimales) via `Intl.NumberFormat`.
- Ne pas arrondir les valeurs intermédiaires (costPerBaseUnit, multiplicateurs, etc.).
