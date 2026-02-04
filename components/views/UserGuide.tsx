
import React, { useState } from 'react';
import { Card } from '../ui/Common';

export const UserGuide: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'basic' | 'tutorial' | 'advanced'>('basic');

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-rose-950 dark:text-rose-100 font-serif mb-2">Guide d'utilisation</h2>
        <p className="text-stone-500 dark:text-stone-400">Apprenez à maîtriser vos coûts et vos marges étape par étape.</p>
        
        <div className="flex justify-center mt-6">
           <div className="bg-stone-100 dark:bg-stone-800 p-1 rounded-lg flex overflow-hidden">
              <button 
                onClick={() => setActiveTab('basic')}
                className={`px-4 py-2 text-sm font-bold transition-colors ${activeTab === 'basic' ? 'bg-white dark:bg-stone-700 shadow text-rose-600 dark:text-rose-400 rounded-md' : 'text-stone-500 dark:text-stone-400'}`}
              >
                Découverte
              </button>
              <button 
                onClick={() => setActiveTab('tutorial')}
                className={`px-4 py-2 text-sm font-bold transition-colors ${activeTab === 'tutorial' ? 'bg-white dark:bg-stone-700 shadow text-rose-600 dark:text-rose-400 rounded-md' : 'text-stone-500 dark:text-stone-400'}`}
              >
                Tutoriel Pas-à-Pas
              </button>
              <button 
                onClick={() => setActiveTab('advanced')}
                className={`px-4 py-2 text-sm font-bold transition-colors ${activeTab === 'advanced' ? 'bg-white dark:bg-stone-700 shadow text-rose-600 dark:text-rose-400 rounded-md' : 'text-stone-500 dark:text-stone-400'}`}
              >
                Concepts Experts
              </button>
           </div>
        </div>
      </div>

      {activeTab === 'basic' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="h-fit">
            <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-4 flex items-center gap-2">
                <span className="bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-200 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold border border-stone-200 dark:border-stone-600">1</span>
                Paramétrage
            </h3>
            <p className="text-sm text-stone-600 dark:text-stone-300 mb-3">
                Commencez par l'onglet <strong>Paramètres</strong>.
            </p>
            <ul className="text-sm text-stone-600 dark:text-stone-400 list-disc pl-5 space-y-2">
                <li>Définissez votre taux horaire et vos taxes (ex: 22%).</li>
                <li>Listez vos charges fixes (Assurance, Banque...).</li>
            </ul>
            </Card>

            <Card className="h-fit">
            <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-4 flex items-center gap-2">
                <span className="bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-200 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold border border-stone-200 dark:border-stone-600">2</span>
                Cuisine & Coûts
            </h3>
            <p className="text-sm text-stone-600 dark:text-stone-300 mb-3">
                Définissez vos matières et recettes.
            </p>
            <ul className="text-sm text-stone-600 dark:text-stone-400 list-disc pl-5 space-y-2">
                <li><strong>Stocks &amp; Achats &gt; Référentiel</strong> : Créez vos ingrédients.</li>
                <li><strong>Recettes</strong> : Assemblez ces ingrédients pour créer des pâtes ou bases.</li>
                <li><strong>Produits</strong> : Créez le produit final (avec emballage et temps de travail) pour obtenir votre prix de revient.</li>
            </ul>
            </Card>

            <Card className="h-fit">
            <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-4 flex items-center gap-2">
                <span className="bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-200 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold border border-stone-200 dark:border-stone-600">3</span>
                Gestion Quotidienne
            </h3>
            <p className="text-sm text-stone-600 dark:text-stone-300 mb-3">
                Utilisez l'application quand vous travaillez.
            </p>
            <ul className="text-sm text-stone-600 dark:text-stone-400 list-disc pl-5 space-y-2">
                <li><strong>Commandes</strong> : Notez ce que les clients demandent.</li>
                <li><strong>Courses</strong> : Générez la liste des ingrédients manquants.</li>
                <li><strong>Production</strong> : Enregistrez ce que vous sortez du four pour déduire les stocks.</li>
            </ul>
            </Card>

            <Card className="h-fit">
            <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-4 flex items-center gap-2">
                <span className="bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-200 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold border border-stone-200 dark:border-stone-600">4</span>
                Sauvegardes
            </h3>
            <p className="text-sm text-stone-600 dark:text-stone-300 mb-3">
                L'application fonctionne dans votre navigateur.
            </p>
            <div className="bg-rose-50 dark:bg-rose-900/30 p-3 rounded-lg border border-rose-100 dark:border-rose-800 text-sm text-rose-800 dark:text-rose-200 mt-2">
                <strong>Attention :</strong> Pensez à cliquer sur "Sauvegardes / Données" en haut à droite régulièrement pour télécharger votre fichier de sauvegarde sur votre ordinateur.
            </div>
            </Card>
        </div>
      )}

      {activeTab === 'tutorial' && (
         <div className="space-y-8 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-stone-800 rounded-xl p-8 border border-stone-200 dark:border-stone-700 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 left-0 w-2 h-full bg-[#D45D79]"></div>
               <h3 className="text-2xl font-bold text-stone-800 dark:text-stone-100 font-serif mb-6">Le Flux de Travail Idéal</h3>
               
               <div className="space-y-8 relative before:absolute before:left-4 before:top-2 before:h-[95%] before:w-0.5 before:bg-stone-200 dark:before:bg-stone-700">
                  <div className="relative pl-12">
                     <div className="absolute left-0 top-0 bg-[#D45D79] text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-md z-10">1</div>
                     <h4 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-2">Configuration Initiale</h4>
                     <p className="text-stone-600 dark:text-stone-400 text-sm mb-2">
                        Avant de commencer à vendre, vous devez dire à l'application combien vous coûte votre entreprise.
                     </p>
                     <ul className="list-disc pl-5 text-sm text-stone-500 space-y-1">
                        <li>Allez dans <strong>Paramètres</strong>.</li>
                        <li>Entrez vos charges fixes réelles (Loyer labo, Assurance, Site Web...).</li>
                        <li>Définissez combien vous voulez gagner de l'heure.</li>
                     </ul>
                  </div>

                  <div className="relative pl-12">
                     <div className="absolute left-0 top-0 bg-stone-200 dark:bg-stone-600 text-stone-600 dark:text-stone-200 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-md z-10">2</div>
                     <h4 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-2">Le Référentiel (La Base de Données)</h4>
                     <p className="text-stone-600 dark:text-stone-400 text-sm mb-2">
                        Construisez votre bibliothèque virtuelle.
                     </p>
                     <div className="bg-stone-50 dark:bg-stone-900 p-4 rounded-lg text-sm border border-stone-200 dark:border-stone-700">
                        <ol className="list-decimal pl-4 space-y-2 text-stone-600 dark:text-stone-300">
                           <li><strong>Onglet Stocks &amp; Achats &gt; Référentiel</strong> : Créez tous vos ingrédients (Farine, Sucre...). Mettez le prix standard de votre fournisseur.</li>
                           <li><strong>Onglet Recettes</strong> : Créez vos bases (Pâte sablée, Ganache...). Ne créez pas le produit fini tout de suite, juste la recette technique.</li>
                           <li><strong>Onglet Produits</strong> : C'est ici que vous créez ce que le client achète (ex: "Tarte au Citron 6 pers"). Vous liez la recette, ajoutez le temps de main d'œuvre, l'emballage et votre marge souhaitée.</li>
                        </ol>
                     </div>
                  </div>

                  <div className="relative pl-12">
                     <div className="absolute left-0 top-0 bg-stone-200 dark:bg-stone-600 text-stone-600 dark:text-stone-200 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-md z-10">3</div>
                     <h4 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-2">La Vie de l'Entreprise (Flux Réel)</h4>
                     <p className="text-stone-600 dark:text-stone-400 text-sm mb-4">
                        Au jour le jour, voici comment utiliser l'app :
                     </p>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <Card className="!p-4">
                            <h5 className="font-bold text-[#D45D79] mb-2">A. Commandes & Courses</h5>
                            <p className="text-xs text-stone-500">
                                Saisissez une commande dans l'onglet <strong>Commandes</strong>. 
                                Allez ensuite dans <strong>Courses</strong> pour voir ce qu'il vous manque en fonction de votre stock actuel.
                            </p>
                         </Card>
                         <Card className="!p-4">
                            <h5 className="font-bold text-[#D45D79] mb-2">B. Achats & Production</h5>
                            <p className="text-xs text-stone-500">
                                Quand vous revenez du magasin, entrez vos tickets dans <strong>Stocks &amp; Achats &gt; Journal</strong>.
                                Quand vous cuisinez, cliquez sur "👩‍🍳 Produire" depuis la commande ou l'onglet <strong>Production</strong>. Cela déduit les ingrédients de votre stock.
                            </p>
                         </Card>
                     </div>
                  </div>

                  <div className="relative pl-12">
                     <div className="absolute left-0 top-0 bg-stone-200 dark:bg-stone-600 text-stone-600 dark:text-stone-200 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-md z-10">4</div>
                     <h4 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-2">Fin de Mois : Le Bilan</h4>
                     <p className="text-stone-600 dark:text-stone-400 text-sm mb-2">
                        Pour savoir si vous êtes rentable :
                     </p>
                     <ul className="list-disc pl-5 text-sm text-stone-500 space-y-1">
                        <li>Allez dans <strong>Bilan</strong>.</li>
                        <li>Vérifiez que les ventes correspondent à la réalité.</li>
                        <li>Choisissez votre méthode de coût (Théorique ou Réel via inventaire).</li>
                        <li>Cliquez sur <strong>Sauvegarder ce Bilan</strong> pour figer les résultats.</li>
                     </ul>
                  </div>
               </div>
            </div>
         </div>
      )}

      {activeTab === 'advanced' && (
          <div className="space-y-6">
              <Card>
                  <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-4">La Gestion des Stocks Avancée</h3>
                  <div className="prose dark:prose-invert max-w-none text-sm text-stone-600 dark:text-stone-300">
                      <p className="mb-2">Pour que le suivi soit efficace, l'application utilise une logique de flux :</p>
                      <ul className="list-disc pl-5 space-y-2 mb-4">
                          <li><strong>Entrées :</strong> Vous enregistrez vos tickets de caisse dans "Journal des Achats". Cela augmente votre stock et met à jour votre prix moyen.</li>
                          <li><strong>Sorties :</strong> Vous enregistrez ce que vous cuisinez dans l'onglet "Production". Cela décrémente votre stock théorique.</li>
                      </ul>
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded border-l-4 border-blue-500">
                          <h4 className="font-bold text-blue-800 dark:text-blue-300">💡 Conseil Pro</h4>
                          <p>
                              Si vous enregistrez rigoureusement votre Production et vos Achats, l'application vous dira combien d'ingrédients il vous reste (Stock Théorique).
                              En fin de mois, comptez ce que vous avez vraiment (Stock Réel). La différence est la "perte inconnue" (vol, erreur dosage, péremption).
                          </p>
                      </div>
                  </div>
              </Card>

              <Card>
                  <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-4">Prix Standard vs Prix Moyen (Lissé)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                      <div>
                          <h4 className="font-bold text-stone-900 dark:text-stone-100 border-b border-stone-200 dark:border-stone-700 pb-2 mb-2">Prix Standard (Fiche Technique)</h4>
                          <p className="text-stone-600 dark:text-stone-400 mb-2">C'est le prix que vous fixez manuellement dans l'onglet "Ingrédients".</p>
                          <p className="text-stone-600 dark:text-stone-400"><strong>Utilité :</strong> Stabiliser vos prix de vente. Même si le beurre augmente de 10cts cette semaine, vous ne changez pas le prix de votre gâteau tous les jours.</p>
                      </div>
                      <div>
                          <h4 className="font-bold text-stone-900 dark:text-stone-100 border-b border-stone-200 dark:border-stone-700 pb-2 mb-2">Prix Moyen Lissé (Réalité)</h4>
                          <p className="text-stone-600 dark:text-stone-400 mb-2">Calculé automatiquement : <em>(Valeur Stock Ancien + Nouvel Achat) / Quantité Totale</em>.</p>
                          <p className="text-stone-600 dark:text-stone-400"><strong>Utilité :</strong> Vérifier si votre marge réelle s'effondre à cause de l'inflation. Si le prix moyen dépasse durablement votre prix standard, il est temps de mettre à jour la fiche technique !</p>
                      </div>
                  </div>
              </Card>

              <Card>
                  <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-4">Calcul des Pertes</h3>
                  <div className="space-y-3 text-sm text-stone-600 dark:text-stone-300">
                      <p>Il existe deux niveaux de pertes dans l'application :</p>
                      <ol className="list-decimal pl-5 space-y-2">
                          <li>
                              <strong>Perte Recette (% Pâte) :</strong> Configuré dans la recette. C'est la pâte qui reste collée au bol.
                              <br/><em className="text-xs text-stone-500">Impact : Augmente le coût matière du batch.</em>
                          </li>
                          <li>
                              <strong>Perte Fabrication (% Cassé/Raté) :</strong> Configuré dans le Produit. C'est le cookie brûlé qu'on jette.
                              <br/><em className="text-xs text-stone-500">Impact : Augmente la consommation de stock théorique. Pour faire 100 cookies vendables avec 10% de perte, il faut consommer les ingrédients pour 111 cookies.</em>
                          </li>
                      </ol>
                  </div>
              </Card>
          </div>
      )}
    </div>
  );
};
