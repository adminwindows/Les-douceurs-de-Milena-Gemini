import React, { useState } from 'react';
import { Card } from '../ui/Common';

export const UserGuide: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'basic' | 'tutorial' | 'advanced'>('basic');

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-rose-950 dark:text-rose-100 font-serif mb-2">Guide d'utilisation</h2>
        <p className="text-stone-500 dark:text-stone-400">Workflow recommandé pour piloter vos prix, commandes et bilans.</p>
        <div className="flex justify-center mt-6">
          <div className="bg-stone-100 dark:bg-stone-800 p-1 rounded-lg flex overflow-hidden">
            <button onClick={() => setActiveTab('basic')} className={`px-4 py-2 text-sm font-bold ${activeTab === 'basic' ? 'bg-white dark:bg-stone-700 rounded-md text-rose-600' : 'text-stone-500'}`}>Découverte</button>
            <button onClick={() => setActiveTab('tutorial')} className={`px-4 py-2 text-sm font-bold ${activeTab === 'tutorial' ? 'bg-white dark:bg-stone-700 rounded-md text-rose-600' : 'text-stone-500'}`}>Tutoriel</button>
            <button onClick={() => setActiveTab('advanced')} className={`px-4 py-2 text-sm font-bold ${activeTab === 'advanced' ? 'bg-white dark:bg-stone-700 rounded-md text-rose-600' : 'text-stone-500'}`}>Concepts</button>
          </div>
        </div>
      </div>

      {activeTab === 'basic' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-lg font-bold mb-3">1. Paramètres</h3>
            <ul className="text-sm list-disc pl-5 space-y-2 text-stone-600 dark:text-stone-300">
              <li>Renseignez charges fixes, cotisations sociales, mode TVA et taux TVA global.</li>
              <li>Saisissez un salaire net mensuel cible (utilisé en mode « Salaire cible »).</li>
              <li>Activez/désactivez l'inclusion des commandes en attente dans le bilan mensuel.</li>
            </ul>
          </Card>
          <Card>
            <h3 className="text-lg font-bold mb-3">2. Catalogue</h3>
            <ul className="text-sm list-disc pl-5 space-y-2 text-stone-600 dark:text-stone-300">
              <li>Créez vos ingrédients puis vos recettes.</li>
              <li>Créez vos produits avec pertes, emballage, marge cible et <strong>prix standard</strong>.</li>
              <li>Le prix standard est repris automatiquement dans les commandes.</li>
            </ul>
          </Card>
          <Card>
            <h3 className="text-lg font-bold mb-3">3. Commandes</h3>
            <ul className="text-sm list-disc pl-5 space-y-2 text-stone-600 dark:text-stone-300">
              <li>Chaque ligne commande contient quantité + prix réellement facturé.</li>
              <li>Un seul taux TVA est appliqué par commande.</li>
              <li>Le bilan regroupe automatiquement les ventes par (produit, prix, taux TVA).</li>
            </ul>
          </Card>
          <Card>
            <h3 className="text-lg font-bold mb-3">4. Bilan mensuel</h3>
            <ul className="text-sm list-disc pl-5 space-y-2 text-stone-600 dark:text-stone-300">
              <li>Section <strong>Ventes</strong> séparée de la section <strong>Invendus</strong>.</li>
              <li>Quand un bilan sauvegardé est rechargé, ses lignes sont figées (historique préservé).</li>
              <li>Vous pouvez ajouter de nouvelles lignes sans modifier l'historique chargé.</li>
            </ul>
          </Card>
        </div>
      )}

      {activeTab === 'tutorial' && (
        <div className="space-y-4">
          <Card>
            <h3 className="text-xl font-bold mb-3">Parcours type</h3>
            <ol className="list-decimal pl-5 text-sm space-y-2 text-stone-600 dark:text-stone-300">
              <li>Paramétrez TVA globale, charges fixes, cotisations et salaire cible.</li>
              <li>Mettez à jour le référentiel ingrédients, puis recettes, puis produits.</li>
              <li>Choisissez vos prix standards dans Produits.</li>
              <li>Saisissez les commandes avec prix réels et taux TVA de la commande.</li>
              <li>En fin de mois, vérifiez Ventes + Invendus dans Bilan, choisissez la méthode de coût matière et sauvegardez.</li>
            </ol>
          </Card>
          <Card>
            <h3 className="text-xl font-bold mb-3">Règles importantes</h3>
            <ul className="list-disc pl-5 text-sm space-y-2 text-stone-600 dark:text-stone-300">
              <li>Le taux TVA est global dans l'application (pas de TVA par produit).</li>
              <li>Le prix minimum ne dépend pas du salaire cible.</li>
              <li>Le mode de recommandation (marge ou salaire) change le prix conseillé, pas l'historique des ventes déjà saisies.</li>
            </ul>
          </Card>
        </div>
      )}

      {activeTab === 'advanced' && (
        <div className="space-y-6">
          <Card>
            <h3 className="text-xl font-bold mb-3">Deux modes de prix conseillé</h3>
            <ul className="list-disc pl-5 text-sm space-y-2 text-stone-600 dark:text-stone-300">
              <li><strong>Marge cible</strong>: prix conseillé basé sur la marge par produit.</li>
              <li><strong>Salaire cible</strong>: prix conseillé basé sur la répartition du salaire mensuel cible sur le volume estimé.</li>
              <li>Le prix minimum (rentable) reste identique dans les deux modes.</li>
            </ul>
          </Card>
          <Card>
            <h3 className="text-xl font-bold mb-3">Helper salaire (mode marge)</h3>
            <p className="text-sm text-stone-600 dark:text-stone-300">
              Le helper estime combien d'unités vendre par produit pour atteindre un salaire cible, avec une pondération par ventes estimées.
            </p>
          </Card>
          <Card>
            <h3 className="text-xl font-bold mb-3">Coût matière du bilan</h3>
            <ul className="list-disc pl-5 text-sm space-y-2 text-stone-600 dark:text-stone-300">
              <li>En mode Théorique, vous choisissez la base prix ingrédient: <strong>prix moyen lissé</strong> ou <strong>dernier prix</strong>.</li>
              <li>Les lignes de vente d'un bilan chargé sont figées pour préserver la cohérence historique.</li>
              <li>Les invendus n'ont pas de prix/TVA sur la ligne: ils impactent uniquement la partie coûts.</li>
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
};
