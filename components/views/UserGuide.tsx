
import React from 'react';
import { Card } from '../ui/Common';

export const UserGuide: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-rose-950 dark:text-rose-100 font-serif mb-2">Guide d'utilisation</h2>
        <p className="text-stone-500 dark:text-stone-400">Apprenez à maîtriser vos coûts et vos marges étape par étape.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="h-fit">
          <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-4 flex items-center gap-2">
            <span className="bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-200 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold border border-stone-200 dark:border-stone-600">1</span>
            Initialisation
          </h3>
          <p className="text-sm text-stone-600 dark:text-stone-300 mb-3">
            Commencez par l'onglet <strong>Paramètres</strong>. C'est la base de vos calculs.
          </p>
          <ul className="text-sm text-stone-600 dark:text-stone-400 list-disc pl-5 space-y-2">
            <li><strong>Taux horaire :</strong> Combien souhaitez-vous gagner par heure de travail ?</li>
            <li><strong>Prélèvements sur CA :</strong> Additionnez vos cotisations sociales (ex: 12.3% ou 21.2% en micro-entreprise) + Impôts.</li>
            <li><strong>Charges Fixes :</strong> Listez vos dépenses mensuelles récurrentes (assurance, abonnement, banque...).</li>
          </ul>
        </Card>

        <Card className="h-fit">
          <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-4 flex items-center gap-2">
            <span className="bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-200 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold border border-stone-200 dark:border-stone-600">2</span>
            Ingrédients & Recettes
          </h3>
          <p className="text-sm text-stone-600 dark:text-stone-300 mb-3">
            Rendez-vous dans <strong>Ingrédients</strong>.
          </p>
          <ul className="text-sm text-stone-600 dark:text-stone-400 list-disc pl-5 space-y-2">
            <li>Rentrez vos ingrédients tels que vous les achetez (ex: 1kg de farine à 1.20€). Le logiciel calcule le prix au gramme.</li>
            <li>Créez ensuite vos <strong>Recettes</strong>. Indiquez le "Rendement" (combien de gâteaux cette recette produit).</li>
            <li>Le coût "batch" est le prix de toute la pâte. Le coût unitaire est divisé par le rendement.</li>
          </ul>
        </Card>

        <Card className="h-fit">
          <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-4 flex items-center gap-2">
            <span className="bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-200 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold border border-stone-200 dark:border-stone-600">3</span>
            Produits (Catalogue)
          </h3>
          <p className="text-sm text-stone-600 dark:text-stone-300 mb-3">
            C'est l'étape cruciale. Un produit lie une recette à un prix de vente.
          </p>
          <ul className="text-sm text-stone-600 dark:text-stone-400 list-disc pl-5 space-y-2">
            <li><strong>Emballage :</strong> Coût de la boîte, du ruban, etc.</li>
            <li><strong>Pertes Fab. (%) :</strong> Si vous ratez souvent 1 cookie sur 10, mettez 10%. Cela augmentera le coût de revient des 9 autres.</li>
            <li><strong>Invendus est. :</strong> Estimation des produits finis jetés. Vous pouvez choisir si l'emballage est aussi perdu ou non via la case à cocher.</li>
            <li><strong>Ventes/mois :</strong> Sert à répartir vos charges fixes (Loyer...) sur chaque gâteau.</li>
          </ul>
        </Card>

        <Card className="h-fit">
          <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-4 flex items-center gap-2">
            <span className="bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-200 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold border border-stone-200 dark:border-stone-600">4</span>
            Commandes & Bilan
          </h3>
          <p className="text-sm text-stone-600 dark:text-stone-300 mb-3">
            Au quotidien, saisissez vos commandes dans l'onglet <strong>Commandes</strong>.
          </p>
          <div className="bg-rose-50 dark:bg-rose-900/30 p-3 rounded-lg border border-rose-100 dark:border-rose-800 text-sm text-rose-800 dark:text-rose-200 mt-2">
            <strong>Le Bilan Mensuel propose 3 modes de calcul :</strong>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Théorique :</strong> Basé sur vos recettes et pourcentages de pertes configurés.</li>
              <li><strong>Réel (Stock) :</strong> Basé sur votre inventaire (Stock début + Achats - Stock fin = Consommation). C'est le plus précis.</li>
              <li><strong>Total Dépenses :</strong> Basé simplement sur le total de vos factures d'achats du mois (approche trésorerie).</li>
            </ul>
          </div>
        </Card>
      </div>

      <div className="mt-8 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-4">Exemple concret : Le Cookie</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-stone-600 dark:text-stone-400">
          <div>
            <p className="mb-2">Imaginez un cookie vendu 3.00€.</p>
            <ul className="space-y-1 list-disc pl-5">
              <li>Matières (Farine, chocolat...) : 0.50€</li>
              <li>Emballage (Sachet) : 0.10€</li>
              <li>Main d'œuvre (5 min à 15€/h) : 1.25€</li>
              <li>Quote-part Loyer/Elec : 0.20€</li>
            </ul>
            <p className="mt-2 font-bold text-stone-800 dark:text-stone-200">Coût complet = 2.05€</p>
          </div>
          <div>
            <p className="mb-2">Calcul du résultat :</p>
            <ul className="space-y-1 list-disc pl-5">
              <li>Prix de vente : 3.00€</li>
              <li>Cotisations (22%) : -0.66€</li>
              <li>Coût complet : -2.05€</li>
            </ul>
            <p className="mt-2 font-bold text-emerald-600 dark:text-emerald-400">Profit net = 0.29€ / cookie</p>
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-1 italic">C'est ce que l'onglet "Analyse Prix" calcule pour vous !</p>
          </div>
        </div>
      </div>
    </div>
  );
};
