
import React, { useState } from 'react';
import { GlobalSettings, FixedCostItem } from '../../types';
import { Card } from '../ui/Common';
import type { DemoDataset } from '../../demoData';

interface Props {
  settings: GlobalSettings;
  setSettings: React.Dispatch<React.SetStateAction<GlobalSettings>>;
  demoDatasets?: DemoDataset[];
  activeDemoDatasetId?: string;
  onActivateDemo?: (id: string) => void;
  onExitDemo?: () => void;
}

export const Settings: React.FC<Props> = ({
  settings,
  setSettings,
  demoDatasets = [],
  activeDemoDatasetId,
  onActivateDemo,
  onExitDemo
}) => {
  const isTva = settings.isTvaSubject;

  const [newFixedCostName, setNewFixedCostName] = useState('');
  const [newFixedCostAmount, setNewFixedCostAmount] = useState('');

  const update = (partial: Partial<GlobalSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  };

  const addFixedCost = () => {
    const name = newFixedCostName.trim();
    const amount = parseFloat(newFixedCostAmount.replace(',', '.'));
    if (!name || isNaN(amount) || amount <= 0) return;

    const item: FixedCostItem = {
      id: 'fc_' + Date.now(),
      name,
      amount,
    };
    update({ fixedCostItems: [...settings.fixedCostItems, item] });
    setNewFixedCostName('');
    setNewFixedCostAmount('');
  };

  const removeFixedCost = (id: string) =>
    update({ fixedCostItems: settings.fixedCostItems.filter(f => f.id !== id) });

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Demo mode zone */}
      {demoDatasets.length > 0 && (
        <Card>
          <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-3">Mode Démonstration</h3>
          {activeDemoDatasetId ? (
            <div className="space-y-3">
              <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-lg border border-indigo-200 dark:border-indigo-800 text-sm text-indigo-800 dark:text-indigo-200">
                Démo active : <strong>{demoDatasets.find(d => d.id === activeDemoDatasetId)?.label}</strong>. Vos données réelles sont sauvegardées et seront restaurées à la sortie.
              </div>
              <button
                onClick={onExitDemo}
                className="bg-stone-600 hover:bg-stone-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
              >
                Quitter la Démo (restaurer mes données)
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-stone-500 dark:text-stone-400 mb-3">Chargez un jeu de données pour explorer sans risque.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {demoDatasets.map(d => (
                  <button
                    key={d.id}
                    onClick={() => onActivateDemo?.(d.id)}
                    className="p-3 rounded-lg border border-stone-200 dark:border-stone-700 hover:border-indigo-400 dark:hover:border-indigo-600 text-left transition-colors bg-white dark:bg-stone-800"
                  >
                    <span className="font-bold text-sm text-stone-800 dark:text-stone-200 block">{d.label}</span>
                    <span className="text-xs text-stone-500 dark:text-stone-400">{d.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Pricing mode */}
      <Card>
        <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-4">Mode de Tarification</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <label
            className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${settings.pricingMode === 'margin' ? 'border-[#D45D79] bg-rose-50 dark:bg-rose-900/20' : 'border-stone-200 dark:border-stone-700 hover:border-stone-300'}`}
          >
            <input
              type="radio"
              name="pricingMode"
              value="margin"
              checked={settings.pricingMode === 'margin'}
              onChange={() => update({ pricingMode: 'margin' })}
              className="sr-only"
            />
            <span className="font-bold text-stone-800 dark:text-stone-200 block mb-1">Marge</span>
            <span className="text-xs text-stone-500 dark:text-stone-400">
              Main d'oeuvre incluse dans le coût. Vous fixez une marge par produit.
            </span>
          </label>

          <label
            className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${settings.pricingMode === 'salary' ? 'border-[#D45D79] bg-rose-50 dark:bg-rose-900/20' : 'border-stone-200 dark:border-stone-700 hover:border-stone-300'}`}
          >
            <input
              type="radio"
              name="pricingMode"
              value="salary"
              checked={settings.pricingMode === 'salary'}
              onChange={() => update({ pricingMode: 'salary' })}
              className="sr-only"
            />
            <span className="font-bold text-stone-800 dark:text-stone-200 block mb-1">Objectif Salaire</span>
            <span className="text-xs text-stone-500 dark:text-stone-400">
              MO exclue du coût. L'app calcule le prix pour atteindre votre salaire cible.
            </span>
          </label>
        </div>

        {settings.pricingMode === 'margin' && (
          <div className="bg-stone-50 dark:bg-stone-800/50 p-3 rounded-lg text-sm text-stone-600 dark:text-stone-300">
            La MO est comptée comme un coût de production. Le prix conseillé couvre coûts + marge.
          </div>
        )}

        {settings.pricingMode === 'salary' && (
          <div className="space-y-3">
            <div className="bg-stone-50 dark:bg-stone-800/50 p-3 rounded-lg text-sm text-stone-600 dark:text-stone-300">
              La MO n'entre pas dans le coût de revient. Le prix conseillé est calculé pour que votre salaire net mensuel atteigne l'objectif ci-dessous.
            </div>
            <div>
              <label className="text-sm font-medium text-stone-700 dark:text-stone-300 block mb-1">
                Objectif salaire mensuel net
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="50"
                  min="0"
                  value={settings.salaryTarget}
                  onChange={e => update({ salaryTarget: parseFloat(e.target.value) || 0 })}
                  className="w-40 px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#D45D79]"
                />
                <span className="text-stone-500 dark:text-stone-400 text-sm">€ / mois</span>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* General settings */}
      <Card>
        <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-4">Paramètres Généraux</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-stone-700 dark:text-stone-300 block mb-1">Taux horaire (€/h)</label>
            <input
              data-testid="settings-hourly-rate"
              type="number"
              step="0.5"
              min="0"
              value={settings.hourlyRate}
              onChange={e => update({ hourlyRate: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#D45D79]"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-stone-700 dark:text-stone-300 block mb-1">
              Taux cotisations sociales (%)
            </label>
            <input
              data-testid="settings-tax-rate"
              type="number"
              step="0.1"
              min="0"
              max="99"
              value={settings.taxRate}
              onChange={e => update({ taxRate: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#D45D79]"
            />
          </div>
        </div>
      </Card>

      {/* TVA */}
      <Card>
        <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-4">TVA</h3>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-stone-700 dark:text-stone-300">Assujetti à la TVA</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.isTvaSubject}
              onChange={e => update({ isTvaSubject: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-stone-300 dark:bg-stone-600 peer-checked:bg-[#D45D79] rounded-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#D45D79] transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
          </label>
        </div>

        {isTva && (
          <div>
            <label className="text-sm font-medium text-stone-700 dark:text-stone-300 block mb-1">
              Taux TVA par défaut (ventes)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="30"
              value={settings.defaultTvaRate}
              onChange={e => update({ defaultTvaRate: parseFloat(e.target.value) || 0 })}
              className="w-40 px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#D45D79]"
            />
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              Appliqué uniformément à tous les produits.
            </p>
          </div>
        )}
      </Card>

      {/* Order filtering */}
      <Card>
        <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-4">Bilan Mensuel</h3>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-stone-700 dark:text-stone-300 block">Inclure les commandes en attente</span>
            <span className="text-xs text-stone-500 dark:text-stone-400">Si activé, les commandes "en attente" sont comptées dans le bilan du mois.</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.includePendingOrdersInMonthlyReport ?? false}
              onChange={e => update({ includePendingOrdersInMonthlyReport: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-stone-300 dark:bg-stone-600 peer-checked:bg-[#D45D79] rounded-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#D45D79] transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
          </label>
        </div>
      </Card>

      {/* Fixed costs */}
      <Card>
        <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-4">Charges Fixes Mensuelles {isTva ? '(HT)' : ''}</h3>

        {settings.fixedCostItems.length > 0 ? (
          <div className="space-y-2 mb-4">
            {settings.fixedCostItems.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-stone-50 dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700"
              >
                <span className="text-sm text-stone-800 dark:text-stone-200">{item.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-stone-700 dark:text-stone-300">{item.amount.toFixed(2)} €</span>
                  <button
                    onClick={() => removeFixedCost(item.id)}
                    className="text-red-500 hover:text-red-700 text-lg font-bold"
                    title="Supprimer"
                  >
                    &times;
                  </button>
                </div>
              </div>
            ))}
            <div className="text-right text-sm font-bold text-stone-800 dark:text-stone-200 pr-10">
              Total : {settings.fixedCostItems.reduce((sum, f) => sum + f.amount, 0).toFixed(2)} € / mois
            </div>
          </div>
        ) : (
          <p className="text-sm text-stone-400 dark:text-stone-500 mb-4">Aucune charge fixe définie.</p>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Nom (ex: Loyer)"
            value={newFixedCostName}
            onChange={e => setNewFixedCostName(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#D45D79]"
          />
          <input
            type="text"
            inputMode="decimal"
            placeholder="Montant"
            value={newFixedCostAmount}
            onChange={e => setNewFixedCostAmount(e.target.value)}
            className="w-28 px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#D45D79]"
          />
          <button
            onClick={addFixedCost}
            className="px-4 py-2 bg-[#D45D79] hover:bg-[#C04B67] text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
          >
            +
          </button>
        </div>
      </Card>
    </div>
  );
};
