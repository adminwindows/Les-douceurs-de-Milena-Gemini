# Formules de calcul (spécification)

## Coût matière recette
- Coût batch = somme(quantité ingrédient en unité de base × coût par unité de base ingrédient).
- Coût batch avec perte recette = coût batch × (1 + lossPercentage/100).

## Ingrédients et TVA
- En franchise TVA: coût utilisé = `priceAmount` saisi (TTC payé).
- En TVA activée:
  - `priceHT = priceBasis === "TTC" ? priceAmount / (1 + vatRate/100) : priceAmount`
  - `priceTTC = priceBasis === "HT" ? priceAmount * (1 + vatRate/100) : priceAmount`
  - Le coût matière utilise toujours `priceHT`.

## Coûts produit (par unité vendue)
- Multiplicateur perte fabrication = `1 / (1 - lossRate)`.
- Matière = coût matière unitaire recette × multiplicateur perte × ((vendus + invendus)/vendus).
- Emballage = coût emballage × unités emballées / vendus.
  - unités emballées = vendus + (packagingUsedOnUnsold ? invendus : 0)
  - si `applyLossToPackaging` activé, multiplier aussi par le multiplicateur de perte fabrication.
- Livraison variable: non implémentée (forcée à 0 dans les calculs).

## Prix minimum
- Coût complet = matière + emballage + MO (selon toggle includeLaborInCost) + charges fixes allouées.
- Les charges fixes ne sont pas converties automatiquement HT/TTC par l'application : elles sont utilisées telles que saisies.
- Diviseur social = `1 - taxRate`.
- Prix minimum HT = coût complet / diviseur.
- Prix TTC = HT × (1 + TVA vente) si TVA activée.

## Bilan mensuel
- Commandes incluses par défaut: `completed` uniquement (`pending` exclues sauf toggle explicite).
- Commandes `cancelled` toujours exclues.
- CA HT/TTC:
  - TVA activée: conversion ligne par ligne selon la TVA produit.
  - Franchise: HT = TTC.
- Base cotisations = CA HT quand TVA activée, sinon CA total.

## Arrondis
- Calculs internes en flottant sans arrondi intermédiaire.
- Arrondi uniquement à l'affichage (format monnaie).
