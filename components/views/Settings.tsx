import React, { useState } from 'react';
import { GlobalSettings, FixedCostItem } from '../../types';
import { Card, Input, Button } from '../ui/Common';
import { formatCurrency } from '../../utils';
import { isNonNegativeNumber, isPercentage, isPositiveNumber, parseOptionalNumber } from '../../validation';
import { DemoDataset } from '../../demoData';

interface Props {
  settings: GlobalSettings;
  setSettings: React.Dispatch<React.SetStateAction<GlobalSettings>>;
  demoDatasets?: DemoDataset[];
  activeDemoDatasetId?: string;
  onActivateDemo?: (datasetId: string) => void;
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
  const triggerActivateDemo = onActivateDemo ?? (() => undefined);
  const triggerExitDemo = onExitDemo ?? (() => undefined);
  const [newCost, setNewCost] = useState({ name: '', amount: '' });
  const newCostAmount = parseOptionalNumber(newCost.amount);
  const isNewCostAmountValid = isPositiveNumber(newCostAmount);
  const isNewCostFormValid = Boolean(newCost.name && isNewCostAmountValid);

  const isTaxRateValid = isPercentage(settings.taxRate);
  const isDefaultTvaRateValid = isPercentage(settings.defaultTvaRate);
  const isHourlyRateValid = isNonNegativeNumber(settings.hourlyRate);

  const handleChange = (key: keyof GlobalSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleNumberChange = (key: keyof GlobalSettings, value: string) => {
    const parsed = parseOptionalNumber(value);
    if (parsed === undefined) return;
    handleChange(key, parsed);
  };

  const handleAddCost = () => {
    if (!isNewCostFormValid) return;
    const item: FixedCostItem = {
      id: Date.now().toString(),
      name: newCost.name,
      amount: Number(newCostAmount)
    };
    setSettings(prev => ({
      ...prev,
      fixedCostItems: [...prev.fixedCostItems, item]
    }));
    setNewCost({ name: '', amount: '' });
  };

  const removeCost = (id: string) => {
    setSettings(prev => ({
      ...prev,
      fixedCostItems: prev.fixedCostItems.filter(i => i.id !== id)
    }));
  };

  const totalFixedCosts = settings.fixedCostItems.reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-rose-950 dark:text-rose-100 font-serif">Paramètres de l'activité</h2>
        <p className="text-stone-500 dark:text-stone-400 mt-2">Configuration globale pour vos calculs.</p>
      </div>

      <Card>
        <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-4 border-b border-stone-200 dark:border-stone-700 pb-2">Mode Démo</h3>
        <p className="text-sm text-stone-600 dark:text-stone-300 mb-4">
          Chargez un jeu de données réaliste pour présenter l'application. Vos données actuelles sont sauvegardées temporairement et restaurées à la sortie.
        </p>

        <div className="space-y-3">
          {demoDatasets.map(dataset => {
            const isActive = activeDemoDatasetId === dataset.id;
            return (
              <div key={dataset.id} className={`p-3 rounded-lg border ${isActive ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : 'border-stone-200 dark:border-stone-700'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="font-bold text-stone-900 dark:text-stone-100">{dataset.label}</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">{dataset.description}</p>
                  </div>
                  <Button size="sm" variant={isActive ? 'ghost' : 'primary'} onClick={() => triggerActivateDemo(dataset.id)}>
                    {isActive ? 'Déjà actif' : 'Activer'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="ghost" onClick={triggerExitDemo} disabled={!activeDemoDatasetId}>Quitter le mode démo et restaurer mes données</Button>
          {activeDemoDatasetId && <span className="text-xs text-indigo-700 dark:text-indigo-300 font-medium self-center">Démo active : {activeDemoDatasetId}</span>}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="h-fit">
          <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-6 border-b border-stone-200 dark:border-stone-700 pb-2">Fiscalité & TVA</h3>
          <div className="space-y-6">
            <div className="p-4 bg-stone-50 dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-700">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-stone-800 dark:text-stone-200">Assujetti à la TVA ?</label>
                <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                  <input
                    type="checkbox"
                    name="toggle"
                    id="toggle"
                    className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white dark:bg-stone-300 border-4 appearance-none cursor-pointer"
                    checked={settings.isTvaSubject}
                    onChange={e => handleChange('isTvaSubject', e.target.checked)}
                    style={{ right: settings.isTvaSubject ? '0' : 'auto', left: settings.isTvaSubject ? 'auto' : '0', borderColor: settings.isTvaSubject ? '#D45D79' : '#ccc' }}
                  />
                  <label
                    htmlFor="toggle"
                    className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${settings.isTvaSubject ? 'bg-[#D45D79]' : 'bg-stone-300 dark:bg-stone-600'}`}
                  ></label>
                </div>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {settings.isTvaSubject
                  ? 'TVA activée : la TVA sur vos achats est récupérable. Les coûts sont calculés en HT. Pour chaque ingrédient, vous indiquez une fois son taux de TVA et si son prix est saisi en TTC ou HT : l’app convertit automatiquement.'
                  : 'Franchise de TVA : vous payez vos achats TTC et ne récupérez pas la TVA. Vous ne facturez pas de TVA sur vos ventes.'}
              </p>
            </div>

            {settings.isTvaSubject && (
              <>
                <Input
                  label="Taux de TVA ventes par défaut"
                  type="number"
                  suffix="%"
                  value={settings.defaultTvaRate}
                  onChange={e => handleNumberChange('defaultTvaRate', e.target.value)}
                  helperText="Généralement 5.5% pour l'alimentaire."
                  error={isDefaultTvaRateValid ? undefined : '< 100%'}
                />
                <Input
                  label="Taux de TVA ingrédients par défaut"
                  type="number"
                  suffix="%"
                  value={settings.defaultIngredientVatRate}
                  onChange={e => handleNumberChange('defaultIngredientVatRate', e.target.value)}
                  helperText="Pré-rempli sur les nouvelles fiches ingrédient (modifiable par ingrédient)."
                  error={isDefaultTvaRateValid ? undefined : '< 100%'}
                />
              </>
            )}

            <div className="p-3 border border-stone-200 dark:border-stone-700 rounded-lg">
              <label className="text-sm font-bold text-stone-700 dark:text-stone-300 flex items-center gap-2">
                <input type="checkbox" checked={settings.includePendingOrdersInMonthlyReport ?? false} onChange={e => handleChange('includePendingOrdersInMonthlyReport', e.target.checked)} />
                Inclure les commandes en attente dans le bilan mensuel
              </label>
              <p className="text-xs text-stone-500 mt-1">Par défaut désactivé : seules les commandes terminées sont comptées.</p>
            </div>

            <div className="border-t border-stone-100 dark:border-stone-700 pt-4">
              <Input
                label="Charges Sociales (URSSAF)"
                type="number"
                suffix="%"
                value={settings.taxRate}
                onChange={e => handleNumberChange('taxRate', e.target.value)}
                helperText={settings.isTvaSubject
                  ? 'Pourcentage prélevé sur votre CA Hors Taxe.'
                  : 'Pourcentage prélevé sur votre CA Total.'}
                error={isTaxRateValid ? undefined : '< 100%'}
              />
            </div>

            <Input
              label="Taux horaire cible"
              type="number"
              suffix="€/h"
              value={settings.hourlyRate}
              onChange={e => handleNumberChange('hourlyRate', e.target.value)}
              helperText={settings.includeLaborInCost ? 'Utilisé pour calculer le coût.' : 'Utilisé uniquement à titre indicatif.'}
              error={isHourlyRateValid ? undefined : '≥ 0'}
            />

            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-indigo-900 dark:text-indigo-200">Inclure la Main d'Oeuvre dans les Coûts ?</label>
                <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                  <input
                    type="checkbox"
                    id="toggle-labor"
                    className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white dark:bg-stone-300 border-4 appearance-none cursor-pointer"
                    checked={settings.includeLaborInCost}
                    onChange={e => handleChange('includeLaborInCost', e.target.checked)}
                    style={{ right: settings.includeLaborInCost ? '0' : 'auto', left: settings.includeLaborInCost ? 'auto' : '0', borderColor: settings.includeLaborInCost ? '#4f46e5' : '#ccc' }}
                  />
                  <label
                    htmlFor="toggle-labor"
                    className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${settings.includeLaborInCost ? 'bg-indigo-600' : 'bg-stone-300 dark:bg-stone-600'}`}
                  ></label>
                </div>
              </div>
              <p className="text-sm text-indigo-900 dark:text-indigo-200">
                {settings.includeLaborInCost
                  ? 'La MO est comptée comme un coût. Votre marge est un profit pur.'
                  : 'La MO est ignorée dans le coût de revient. Votre marge doit donc couvrir votre salaire.'}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex justify-between items-center mb-6 border-b border-stone-200 dark:border-stone-700 pb-2">
            <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100">Charges Fixes Mensuelles</h3>
            <span className="text-xl font-bold text-[#D45D79] dark:text-rose-400">{formatCurrency(totalFixedCosts)}</span>
          </div>

          <div className="space-y-4 mb-6">
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {settings.fixedCostItems.map(item => (
                <div key={item.id} className="flex justify-between items-center bg-stone-50 dark:bg-stone-900 p-3 rounded-lg border border-stone-200 dark:border-stone-700">
                  <span className="font-medium text-stone-700 dark:text-stone-300">{item.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-stone-900 dark:text-stone-100">{formatCurrency(item.amount)}</span>
                    <button onClick={() => removeCost(item.id)} className="text-stone-400 hover:text-red-500 dark:hover:text-red-400">×</button>
                  </div>
                </div>
              ))}
              {settings.fixedCostItems.length === 0 && <p className="text-stone-400 italic text-sm">Aucune charge fixe définie.</p>}
            </div>
          </div>

          <div className="p-4 bg-[#FDF8F6] dark:bg-stone-900 rounded-lg border border-rose-100 dark:border-stone-700">
            <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200 mb-1">Ajouter une charge</h4>
            {settings.isTvaSubject && (
              <p className="text-xs text-stone-500 mb-3">TVA activée : saisissez vos charges fixes dans la même base que votre suivi comptable habituel (recommandé : HT).</p>
            )}
            <div className="flex gap-2 mb-2">
              <input
                className="flex-1 px-3 py-2 rounded border border-rose-200 dark:border-stone-600 bg-white dark:bg-stone-800 dark:text-stone-100 text-sm focus:outline-none focus:border-[#D45D79]"
                placeholder="Ex: Assurance"
                value={newCost.name}
                onChange={e => setNewCost({ ...newCost, name: e.target.value })}
              />
              <input
                className="w-24 px-3 py-2 rounded border border-rose-200 dark:border-stone-600 bg-white dark:bg-stone-800 dark:text-stone-100 text-sm focus:outline-none focus:border-[#D45D79]"
                placeholder="€"
                type="number"
                value={newCost.amount}
                onChange={e => setNewCost({ ...newCost, amount: e.target.value })}
              />
            </div>
            {!isNewCostAmountValid && newCost.amount !== '' && (
              <p className="text-xs text-red-500">Montant &gt; 0 requis.</p>
            )}
            <Button size="sm" onClick={handleAddCost} disabled={!isNewCostFormValid} className="w-full">
              Ajouter
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
