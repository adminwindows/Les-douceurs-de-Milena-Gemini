# Formules de calcul (spécification)

## 1. Coût matière recette

### Coût par unité de base d'un ingrédient

```
costPerBaseUnit = prix_HT / (quantité_achetée × multiplicateur)
```

- **multiplicateur** = 1000 si l'unité est `kg` ou `L` (conversion en g ou ml), sinon 1 (g, ml, pièce).
- **prix_HT** : toujours HT. C'est la seule base stockée pour les ingrédients.
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

## 2. Ingrédients : tout est HT

Les prix des ingrédients sont **toujours stockés en HT**. Aucun taux de TVA n'est attaché à un ingrédient.

- **Franchise TVA (OFF)** : les prix n'ont pas de notion HT/TTC. Pas de convertisseur affiché.
- **Assujetti TVA (ON)** : les prix affichés sont HT. Un convertisseur TTC → HT éphémère est disponible à la saisie.

### Convertisseur TTC → HT (UI-only)

```
priceHT = priceTTC / (1 + vatRate / 100)
```

- Disponible uniquement quand `isTvaSubject = true`.
- Le taux TVA utilisé est pré-rempli avec `ingredient.helperVatRate` (dernier taux utilisé) ou `settings.defaultTvaRate` en fallback.
- `helperVatRate` est une commodité de pré-remplissage, jamais utilisée dans aucun calcul de coût.

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
- En mode assujetti TVA, les charges fixes doivent être saisies HT (la TVA sur ces charges étant récupérable).

### Coûts variables totaux

```
totalVariableCosts = finalMaterialCost + finalPackagingCost
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

- Seuls les **produits** (prix de vente) ont un taux TVA. Les ingrédients n'en ont pas.

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
