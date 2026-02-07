import { AppData } from './dataSchema';
import { Unit } from './types';

export interface DemoDataset {
  id: string;
  label: string;
  description: string;
  data: AppData;
}

const today = new Date().toISOString().slice(0, 10);

export const DEMO_DATASETS: DemoDataset[] = [
  {
    id: 'launch-week',
    label: 'Lancement - Activité légère',
    description: 'Peu de produits, quelques commandes et un bilan simple.',
    data: {
      settings: {
        currency: 'EUR',
        hourlyRate: 18,
        includeLaborInCost: true,
        fixedCostItems: [
          { id: 'dfc1', name: 'Énergie', amount: 55 },
          { id: 'dfc2', name: 'Assurance', amount: 35 }
        ],
        taxRate: 22,
        isTvaSubject: false,
        defaultTvaRate: 5.5
      },
      ingredients: [
        { id: 'di1', name: 'Farine T45', unit: Unit.KG, price: 1.35, quantity: 2.5, costPerBaseUnit: 0.00135 },
        { id: 'di2', name: 'Beurre doux', unit: Unit.KG, price: 13.5, quantity: 1.2, costPerBaseUnit: 0.0135 },
        { id: 'di3', name: 'Sucre', unit: Unit.KG, price: 1.45, quantity: 1.8, costPerBaseUnit: 0.00145 },
        { id: 'di4', name: 'Œufs', unit: Unit.PIECE, price: 0.39, quantity: 24, costPerBaseUnit: 0.39 }
      ],
      recipes: [
        {
          id: 'dr1',
          name: 'Pâte sablée',
          ingredients: [
            { ingredientId: 'di1', quantity: 500 },
            { ingredientId: 'di2', quantity: 250 },
            { ingredientId: 'di3', quantity: 120 },
            { ingredientId: 'di4', quantity: 2 }
          ],
          batchYield: 8,
          lossPercentage: 2
        }
      ],
      products: [
        {
          id: 'dp1',
          name: 'Tartelettes nature',
          recipeId: 'dr1',
          laborTimeMinutes: 7,
          packagingCost: 0.2,
          variableDeliveryCost: 0,
          lossRate: 2,
          unsoldEstimate: 1,
          packagingUsedOnUnsold: false,
          targetMargin: 1.6,
          estimatedMonthlySales: 60,
          category: 'tartelette'
        }
      ],
      orders: [
        { id: 'do1', customerName: 'Claire M.', date: today, items: [{ productId: 'dp1', quantity: 12 }], status: 'pending' },
        { id: 'do2', customerName: 'Boulangerie Nova', date: today, items: [{ productId: 'dp1', quantity: 20 }], status: 'completed' }
      ],
      savedReports: [],
      purchases: [
        { id: 'dpu1', date: today, ingredientId: 'di1', quantity: 10, price: 13.5 },
        { id: 'dpu2', date: today, ingredientId: 'di2', quantity: 2, price: 27 }
      ],
      productionBatches: [
        { id: 'db1', date: today, productId: 'dp1', quantity: 24 }
      ]
    }
  },
  {
    id: 'wedding-season',
    label: 'Saison mariages - Forte charge',
    description: 'Catalogue complet, rythme élevé et TVA activée.',
    data: {
      settings: {
        currency: 'EUR',
        hourlyRate: 24,
        includeLaborInCost: true,
        fixedCostItems: [
          { id: 'wfc1', name: 'Loyer atelier', amount: 540 },
          { id: 'wfc2', name: 'Électricité / froid', amount: 190 },
          { id: 'wfc3', name: 'Marketing', amount: 120 }
        ],
        taxRate: 23,
        isTvaSubject: true,
        defaultTvaRate: 5.5
      },
      ingredients: [
        { id: 'wi1', name: 'Farine', unit: Unit.KG, price: 1.5, quantity: 24, costPerBaseUnit: 0.0015 },
        { id: 'wi2', name: 'Sucre glace', unit: Unit.KG, price: 2.1, quantity: 10, costPerBaseUnit: 0.0021 },
        { id: 'wi3', name: 'Beurre AOP', unit: Unit.KG, price: 15.5, quantity: 12, costPerBaseUnit: 0.0155 },
        { id: 'wi4', name: 'Chocolat de couverture', unit: Unit.KG, price: 18.5, quantity: 8, costPerBaseUnit: 0.0185 },
        { id: 'wi5', name: 'Crème 35%', unit: Unit.L, price: 4.8, quantity: 15, costPerBaseUnit: 0.0048 }
      ],
      recipes: [
        {
          id: 'wr1',
          name: 'Ganache montée',
          ingredients: [
            { ingredientId: 'wi4', quantity: 350 },
            { ingredientId: 'wi5', quantity: 450 },
            { ingredientId: 'wi2', quantity: 40 }
          ],
          batchYield: 20,
          lossPercentage: 4
        },
        {
          id: 'wr2',
          name: 'Sablé vanille',
          ingredients: [
            { ingredientId: 'wi1', quantity: 600 },
            { ingredientId: 'wi3', quantity: 280 },
            { ingredientId: 'wi2', quantity: 110 }
          ],
          batchYield: 40,
          lossPercentage: 3
        }
      ],
      products: [
        {
          id: 'wp1',
          name: 'Macaron prestige',
          recipeId: 'wr1',
          laborTimeMinutes: 10,
          packagingCost: 0.28,
          variableDeliveryCost: 0.1,
          lossRate: 7,
          unsoldEstimate: 10,
          packagingUsedOnUnsold: true,
          targetMargin: 1.8,
          estimatedMonthlySales: 450,
          category: 'macaron',
          tvaRate: 5.5
        },
        {
          id: 'wp2',
          name: 'Sablé premium',
          recipeId: 'wr2',
          laborTimeMinutes: 5,
          packagingCost: 0.12,
          variableDeliveryCost: 0.05,
          lossRate: 2,
          unsoldEstimate: 8,
          packagingUsedOnUnsold: false,
          targetMargin: 1,
          estimatedMonthlySales: 600,
          category: 'biscuit',
          tvaRate: 5.5
        }
      ],
      orders: [
        { id: 'wo1', customerName: 'Mariage Dupont', date: today, items: [{ productId: 'wp1', quantity: 180 }], status: 'pending' },
        { id: 'wo2', customerName: 'Traiteur Rivière', date: today, items: [{ productId: 'wp2', quantity: 220 }], status: 'completed' }
      ],
      savedReports: [],
      purchases: [
        { id: 'wpu1', date: today, ingredientId: 'wi4', quantity: 12, price: 222 },
        { id: 'wpu2', date: today, ingredientId: 'wi3', quantity: 18, price: 279 }
      ],
      productionBatches: [
        { id: 'wb1', date: today, productId: 'wp1', quantity: 200 },
        { id: 'wb2', date: today, productId: 'wp2', quantity: 300 }
      ]
    }
  },
  {
    id: 'tight-margin',
    label: 'Tension marge - Coûts en hausse',
    description: 'Cas pédagogique pour analyser une baisse de rentabilité.',
    data: {
      settings: {
        currency: 'EUR',
        hourlyRate: 16,
        includeLaborInCost: false,
        fixedCostItems: [
          { id: 'tfc1', name: 'Loyer', amount: 250 },
          { id: 'tfc2', name: 'Abonnements', amount: 65 }
        ],
        taxRate: 21,
        isTvaSubject: false,
        defaultTvaRate: 5.5
      },
      ingredients: [
        { id: 'ti1', name: 'Farine', unit: Unit.KG, price: 1.65, quantity: 4, costPerBaseUnit: 0.00165 },
        { id: 'ti2', name: 'Beurre', unit: Unit.KG, price: 18.2, quantity: 1.5, costPerBaseUnit: 0.0182 },
        { id: 'ti3', name: 'Chocolat', unit: Unit.KG, price: 22.4, quantity: 1.2, costPerBaseUnit: 0.0224 }
      ],
      recipes: [
        {
          id: 'tr1',
          name: 'Cookie cacao',
          ingredients: [
            { ingredientId: 'ti1', quantity: 300 },
            { ingredientId: 'ti2', quantity: 180 },
            { ingredientId: 'ti3', quantity: 160 }
          ],
          batchYield: 14,
          lossPercentage: 5
        }
      ],
      products: [
        {
          id: 'tp1',
          name: 'Cookie cacao intense',
          recipeId: 'tr1',
          laborTimeMinutes: 6,
          packagingCost: 0.15,
          variableDeliveryCost: 0,
          lossRate: 6,
          unsoldEstimate: 5,
          packagingUsedOnUnsold: false,
          targetMargin: 0.7,
          estimatedMonthlySales: 180,
          category: 'cookie'
        }
      ],
      orders: [
        { id: 'to1', customerName: 'Salon local', date: today, items: [{ productId: 'tp1', quantity: 60 }], status: 'completed' }
      ],
      savedReports: [],
      purchases: [
        { id: 'tpu1', date: today, ingredientId: 'ti2', quantity: 3, price: 54.6 },
        { id: 'tpu2', date: today, ingredientId: 'ti3', quantity: 2, price: 44.8 }
      ],
      productionBatches: [
        { id: 'tb1', date: today, productId: 'tp1', quantity: 90 }
      ]
    }
  }
];

export const cloneAppData = (data: AppData): AppData => {
  return JSON.parse(JSON.stringify(data)) as AppData;
};

export const getDemoDatasetById = (id: string): DemoDataset | undefined => {
  return DEMO_DATASETS.find(dataset => dataset.id === id);
};
