import React, { useState } from 'react';
import { GlobalSettings, FixedCostItem } from '../../types';
import { Card, Input, Button, InfoTooltip } from '../ui/Common';
import { formatCurrency, toNumber } from '../../utils';

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
      amount: toNumber(newCost.amount)
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
        <h2 className="text-3xl font-bold text-rose-950 font-serif">Paramètres de l'activité</h2>
        <p className="text-stone-500 mt-2">Configuration globale pour vos calculs.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="h-fit">
          <h3 className="text-xl font-bold text-stone-800 mb-6 border-b border-stone-100 pb-2">Main d'œuvre & Fiscalité</h3>
          <div className="space-y-6">
            <Input
              label="Taux horaire"
              type="number"
              suffix="€/h"
              value={settings.hourlyRate}
              onChange={e => handleChange('hourlyRate', toNumber(e.target.value))}
              helperText="Votre objectif de rémunération horaire."
            />
            
            <div className="flex items-center">
              <Input
                className="flex-1"
                label="Prélèvements sur CA"
                type="number"
                suffix="%"
                value={settings.taxRate}
                onChange={e => handleChange('taxRate', toNumber(e.target.value))}
                helperText="Cotisations URSSAF + Impôts sur le revenu."
              />
              <InfoTooltip text="Ce pourcentage est déduit de votre prix de vente pour payer les charges sociales." />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex justify-between items-center mb-6 border-b border-stone-100 pb-2">
            <h3 className="text-xl font-bold text-stone-800">Charges Fixes Mensuelles</h3>
            <span className="text-xl font-bold text-[#D45D79]">{formatCurrency(totalFixedCosts)}</span>
          </div>
          
          <div className="space-y-4 mb-6">
             <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
               {settings.fixedCostItems.map(item => (
                 <div key={item.id} className="flex justify-between items-center bg-stone-50 p-3 rounded-lg border border-stone-200">
                   <span className="font-medium text-stone-700">{item.name}</span>
                   <div className="flex items-center gap-3">
                     <span className="font-bold text-stone-900">{formatCurrency(item.amount)}</span>
                     <button onClick={() => removeCost(item.id)} className="text-stone-400 hover:text-red-500">×</button>
                   </div>
                 </div>
               ))}
               {settings.fixedCostItems.length === 0 && <p className="text-stone-400 italic text-sm">Aucune charge fixe définie.</p>}
             </div>
          </div>

          <div className="p-4 bg-[#FDF8F6] rounded-lg border border-rose-100">
            <h4 className="text-sm font-bold text-rose-900 mb-3">Ajouter une charge</h4>
            <div className="flex gap-2 mb-2">
              <input 
                className="flex-1 px-3 py-2 rounded border border-rose-200 text-sm focus:outline-none focus:border-[#D45D79]"
                placeholder="Ex: Assurance"
                value={newCost.name}
                onChange={e => setNewCost({...newCost, name: e.target.value})}
              />
              <input 
                className="w-24 px-3 py-2 rounded border border-rose-200 text-sm focus:outline-none focus:border-[#D45D79]"
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
