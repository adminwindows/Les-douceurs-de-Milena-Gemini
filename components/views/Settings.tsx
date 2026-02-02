
import React, { useState } from 'react';
import { GlobalSettings, FixedCostItem } from '../../types';
import { Card, Input, Button, InfoTooltip } from '../ui/Common';
import { formatCurrency } from '../../utils';

interface Props {
  settings: GlobalSettings;
  setSettings: React.Dispatch<React.SetStateAction<GlobalSettings>>;
}

export const Settings: React.FC<Props> = ({ settings, setSettings }) => {
  const [newCost, setNewCost] = useState({ name: '', amount: '' });

  const handleChange = (key: keyof GlobalSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleAddCost = () => {
    if (!newCost.name || !newCost.amount) return;
    const item: FixedCostItem = {
      id: Date.now().toString(),
      name: newCost.name,
      amount: parseFloat(newCost.amount)
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
                  ? "Vos prix d'achat sont considérés HT. Vos prix de vente incluent la TVA." 
                  : "Franchise de TVA. Vos prix d'achat sont TTC. Pas de TVA sur vos ventes."}
              </p>
            </div>

            {settings.isTvaSubject && (
              <Input
                label="Taux de TVA par défaut"
                type="number"
                suffix="%"
                value={settings.defaultTvaRate}
                onChange={e => handleChange('defaultTvaRate', parseFloat(e.target.value))}
                helperText="Généralement 5.5% pour l'alimentaire."
              />
            )}

            <div className="border-t border-stone-100 dark:border-stone-700 pt-4">
              <Input
                label="Charges Sociales (URSSAF)"
                type="number"
                suffix="%"
                value={settings.taxRate}
                onChange={e => handleChange('taxRate', parseFloat(e.target.value))}
                helperText={settings.isTvaSubject 
                  ? "Pourcentage prélevé sur votre CA Hors Taxe." 
                  : "Pourcentage prélevé sur votre CA Total."}
              />
            </div>

            <Input
              label="Taux horaire cible"
              type="number"
              suffix="€/h"
              value={settings.hourlyRate}
              onChange={e => handleChange('hourlyRate', parseFloat(e.target.value))}
              helperText="Pour estimer le coût de votre temps de travail."
            />
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
            <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200 mb-3">Ajouter une charge {settings.isTvaSubject ? 'HT' : ''}</h4>
            <div className="flex gap-2 mb-2">
              <input 
                className="flex-1 px-3 py-2 rounded border border-rose-200 dark:border-stone-600 bg-white dark:bg-stone-800 dark:text-stone-100 text-sm focus:outline-none focus:border-[#D45D79]"
                placeholder="Ex: Assurance"
                value={newCost.name}
                onChange={e => setNewCost({...newCost, name: e.target.value})}
              />
              <input 
                className="w-24 px-3 py-2 rounded border border-rose-200 dark:border-stone-600 bg-white dark:bg-stone-800 dark:text-stone-100 text-sm focus:outline-none focus:border-[#D45D79]"
                placeholder="€"
                type="number"
                value={newCost.amount}
                onChange={e => setNewCost({...newCost, amount: e.target.value})}
              />
            </div>
            <Button size="sm" onClick={handleAddCost} disabled={!newCost.name || !newCost.amount} className="w-full">
              Ajouter
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
