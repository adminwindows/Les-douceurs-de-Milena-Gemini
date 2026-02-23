import React, { useMemo, useState } from 'react';
import { Card } from '../ui/Common';

type GuideTab = 'start' | 'screens' | 'faq';

interface GuideSection {
  id: string;
  tab: GuideTab;
  title: string;
  summary: string;
  steps: string[];
  tips?: string[];
  keywords: string[];
}

const TAB_LABELS: Record<GuideTab, string> = {
  start: 'Demarrage',
  screens: 'Par ecran',
  faq: 'FAQ'
};

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'start-order',
    tab: 'start',
    title: 'Ordre recommande pour debuter',
    summary: 'Suivez cet ordre pour eviter les calculs incoherents.',
    steps: [
      '1) Ouvrez Parametres: TVA, charges sociales, charges fixes, salaire cible.',
      '2) Ouvrez Stocks & Achats > Referentiel Ingredients pour creer vos matieres premieres.',
      '3) Ouvrez Recettes pour creer chaque recette avec rendement et pertes matieres.',
      '4) Ouvrez Produits pour lier recette, emballage, marge, pertes fabrication et prix standard.',
      '5) Ouvrez Prix pour controler prix minimum et prix conseilles.',
      '6) Ouvrez Commandes pour saisir les ventes reelles.',
      '7) Ouvrez Production pour enregistrer ce qui est fabrique.',
      '8) Ouvrez Bilan en fin de mois, verifiez Ventes + Invendus + Couts, puis sauvegardez.'
    ],
    tips: [
      'Si un doute: corrigez d abord les Parametres, puis re-verifiez Prix et Bilan.',
      'Les donnees de demonstration sont utiles pour apprendre sans toucher vos vraies donnees.'
    ],
    keywords: ['debut', 'demarrage', 'ordre', 'workflow', 'premiere utilisation']
  },
  {
    id: 'start-save-model',
    tab: 'start',
    title: 'Comment la sauvegarde fonctionne',
    summary: 'Les modifications restent en brouillon tant que vous ne validez pas.',
    steps: [
      'Quand vous modifiez une valeur, la modification reste en attente.',
      'Le bandeau du haut affiche Modifications en attente.',
      'Cliquez Valider pour sauvegarder les changements.',
      'Cliquez Annuler pour revenir au dernier etat valide.',
      'Si vous changez d onglet sans valider, le brouillon reste disponible.'
    ],
    tips: [
      'C est normal de voir des brouillons: cela evite de perdre une saisie en cours.',
      'La validation globale est le moment officiel de sauvegarde.'
    ],
    keywords: ['valider', 'annuler', 'brouillon', 'modifications en attente', 'save']
  },
  {
    id: 'start-backups',
    tab: 'start',
    title: 'Sauvegardes, import, export et reset',
    summary: 'Le bouton Sauvegardes / Donnees centralise securite et maintenance.',
    steps: [
      'Export: choisissez les blocs a sauvegarder (parametres, catalogue, operations, bilans).',
      'Import: rechargez un fichier et choisissez quels blocs remplacer.',
      'Nettoyer les brouillons obsoletes: supprime les brouillons anciens/corrompus.',
      'Reinitialiser toutes les donnees: efface toutes les donnees locales de l application.'
    ],
    tips: [
      'Avant un import massif, faites d abord un export de securite.',
      'Le reset est irreversible.'
    ],
    keywords: ['backup', 'import', 'export', 'reinitialiser', 'reset', 'stockage']
  },
  {
    id: 'screen-settings',
    tab: 'screens',
    title: 'Ecran Parametres',
    summary: 'Configure la logique economique globale de toute l application.',
    steps: [
      'Activez ou desactivez la TVA.',
      'Si TVA active, renseignez le taux de TVA global des nouvelles ventes.',
      'Renseignez cotisations sociales (URSSAF) en pourcentage.',
      'Renseignez le salaire net mensuel cible pour le mode de prix Salaire cible.',
      'Ajoutez vos charges fixes mensuelles (loyer, assurances, abonnements...).',
      'Option: inclure les commandes en attente dans le bilan mensuel.'
    ],
    tips: [
      'Le taux TVA est global; les commandes utilisent un taux unique par commande.',
      'Les charges fixes impactent le resultat net du bilan.'
    ],
    keywords: ['parametres', 'tva', 'urssaf', 'charges fixes', 'salaire cible']
  },
  {
    id: 'screen-demo',
    tab: 'screens',
    title: 'Mode demo',
    summary: 'Permet de tester l app avec un jeu de donnees realiste.',
    steps: [
      'Choisissez un dataset demo et cliquez Activer.',
      'Travaillez normalement dans tous les onglets.',
      'Cliquez Quitter le mode demo pour restaurer vos donnees reelles.'
    ],
    tips: [
      'Le mode demo est ideal pour la formation d un debutant.',
      'Une sauvegarde temporaire de vos vraies donnees est geree automatiquement.'
    ],
    keywords: ['demo', 'dataset', 'formation', 'test']
  },
  {
    id: 'screen-stock',
    tab: 'screens',
    title: 'Stocks & Achats',
    summary: 'Trois sous-onglets: referentiel ingredients, journal achats, analyse stock/prix.',
    steps: [
      'Referentiel ingredients: creez ou modifiez nom, unite, prix de reference.',
      'Journal des achats: saisissez date, quantite, prix total; le stock theorique augmente.',
      'Analyse stock/prix: compare prix standard vs dernier prix vs prix moyen et mettez a jour la fiche.'
    ],
    tips: [
      'Avec TVA active, les achats sont geres en HT pour le calcul de cout.',
      'Supprimer un achat retire sa quantite du stock theorique.'
    ],
    keywords: ['stocks', 'achats', 'ingredient', 'prix moyen', 'dernier prix', 'ht']
  },
  {
    id: 'screen-recipes',
    tab: 'screens',
    title: 'Recettes',
    summary: 'Definit la composition et le cout matiere d un batch.',
    steps: [
      'Saisissez nom, rendement (unites produites) et pertes matieres (%).',
      'Ajoutez les ingredients avec quantites (doublon ingredient = quantites additionnees).',
      'Verifiez cout batch et cout matiere par unite.',
      'Utilisez le scaler pour recalculer rapidement les quantites a produire.'
    ],
    tips: [
      'Rendement doit etre > 0.',
      'Le scaler ne modifie pas la recette, il sert de calculateur.'
    ],
    keywords: ['recette', 'batch', 'rendement', 'pertes', 'scaler']
  },
  {
    id: 'screen-products',
    tab: 'screens',
    title: 'Produits',
    summary: 'Relie une recette a un produit vendable et fixe ses parametres economiques.',
    steps: [
      'Saisissez nom commercial, recette, categorie.',
      'Renseignez ventes/mois, invendus estimes, emballage, marge cible, perte fabrication.',
      'Option: prix standard; si vide, le prix conseille peut etre utilise.',
      'Option: regler si emballage compte pour les invendus et si perte fab impacte l emballage.'
    ],
    tips: [
      'Le prix standard est repris automatiquement dans Commandes.',
      'Le produit apparait ensuite dans Prix, Commandes, Production et Bilan.'
    ],
    keywords: ['produit', 'prix standard', 'marge', 'emballage', 'invendus']
  },
  {
    id: 'screen-analysis',
    tab: 'screens',
    title: 'Prix (Analyse)',
    summary: 'Compare les prix et explique le calcul du prix conseille.',
    steps: [
      'Choisissez le mode de recommandation: Marge cible ou Salaire cible.',
      'Choisissez la base de cout matiere: standard, prix moyen lisse, ou dernier prix.',
      'Lisez le tableau: cout complet, prix min, conseille marge, conseille salaire, prix standard.',
      'En mode marge, utilisez le helper salaire pour estimer les volumes a vendre.'
    ],
    tips: [
      'Le prix minimum reste identique quel que soit le mode.',
      'Le prix conseille marge peut depasser prix min + marge a cause des cotisations sociales et de la TVA.'
    ],
    keywords: ['analyse', 'prix min', 'prix conseille', 'marge', 'salaire cible', 'formule']
  },
  {
    id: 'screen-orders',
    tab: 'screens',
    title: 'Commandes',
    summary: 'Saisie commerciale: client, date, lignes produit, prix reel et statut.',
    steps: [
      'Creez une commande: client, date, taux TVA commande, lignes produits.',
      'Chaque ligne contient produit, quantite, prix reel facture.',
      'Bouton Produire: envoie les lignes vers Production (avec alerte en cas de relance).',
      'Marquer livree: demande si la production est deja lancee ou doit etre ajoutee maintenant.'
    ],
    tips: [
      'Une commande peut avoir plusieurs lignes du meme produit.',
      'Le badge Production lancee signale un envoi deja effectue.'
    ],
    keywords: ['commande', 'client', 'produire', 'livree', 'statut', 'tva commande']
  },
  {
    id: 'screen-production',
    tab: 'screens',
    title: 'Production',
    summary: 'Journal de fabrication; deduit/restaure automatiquement le stock ingredient.',
    steps: [
      'Saisissez date, produit fabrique, quantite produite.',
      'Avant validation, la fiche recette de production affiche les quantites a preparer.',
      'Validation ajoute une ligne de production et deduit les ingredients du stock.',
      'Suppression d une ligne restaure les ingredients avec confirmation.'
    ],
    tips: [
      'Si stock insuffisant, un avertissement permet de confirmer ou annuler.',
      'Un panneau d alerte compare livres vs produits enregistres.'
    ],
    keywords: ['production', 'fabrication', 'stock insuffisant', 'historique', 'batch']
  },
  {
    id: 'screen-shopping',
    tab: 'screens',
    title: 'Courses',
    summary: 'Calcule les besoins ingredients a acheter sur une periode.',
    steps: [
      'Choisissez une date debut et une date fin.',
      'L app analyse les commandes de la periode (hors annulees).',
      'Le tableau affiche besoin recette, stock, et quantite a acheter.',
      'Utilisez Imprimer la liste pour sortie papier/PDF navigateur.'
    ],
    tips: [
      'Les besoins sont derives des recettes des produits commandes.',
      'Les unites g/ml et kg/L sont converties pour comparer besoin et stock.'
    ],
    keywords: ['courses', 'liste', 'achat', 'periode', 'imprimer']
  },
  {
    id: 'screen-report',
    tab: 'screens',
    title: 'Bilan mensuel',
    summary: 'Consolide ventes, invendus, couts et resultat net pour un mois.',
    steps: [
      'Choisissez le mois.',
      'Verifiez 1) Ventes (produit, qte, prix, TVA si active).',
      'Verifiez 2) Invendus.',
      'Choisissez 3) Mode de cout: Theorique, Stock, ou Factures.',
      'Sauvegardez le bilan; ensuite l historique du mois devient fige.',
      'Exportez en PDF; sur mobile l app essaye le partage natif.'
    ],
    tips: [
      'Si un bilan est recharge, les lignes historiques restent en lecture seule.',
      'Les ajouts apres chargement se font sur de nouvelles lignes.',
      'Les invendus additionnent les ajouts du meme produit.'
    ],
    keywords: ['bilan', 'mensuel', 'ventes', 'invendus', 'pdf', 'historique', 'cout']
  },
  {
    id: 'faq-price',
    tab: 'faq',
    title: 'Pourquoi le prix conseille peut paraitre haut ?',
    summary: 'Le calcul inclut plus que la marge brute.',
    steps: [
      'Base HT: cout complet + marge cible.',
      'Couverture cotisations sociales: division par (1 - taux social).',
      'Si TVA active: conversion en TTC.',
      'Resultat: le prix conseille peut depasser la simple addition cout + marge.'
    ],
    keywords: ['prix conseille', 'marge', 'cotisations', 'tva', 'formule'],
    tips: ['Utilisez l onglet Prix pour voir les colonnes HT/TTC et comprendre chaque etape.']
  },
  {
    id: 'faq-tva',
    tab: 'faq',
    title: 'Quand la TVA apparait-elle ?',
    summary: 'La TVA depend du mode assujetti et des ecrans.',
    steps: [
      'Si TVA inactive: les champs TVA sont masques ou fixes a 0.',
      'Si TVA active: un taux global est defini dans Parametres.',
      'Commandes et lignes de bilan peuvent afficher un taux TVA.',
      'Les achats ingredients sont raisonnes en HT pour les couts.'
    ],
    keywords: ['tva', 'assujetti', 'ht', 'ttc', 'parametres']
  },
  {
    id: 'faq-missing-product',
    tab: 'faq',
    title: 'Pourquoi je vois Produit supprime ?',
    summary: 'Une ligne historique reference un produit retire du catalogue.',
    steps: [
      'Les commandes et bilans conservent l historique meme si le produit est supprime.',
      'Le libelle Produit supprime evite de casser les anciens enregistrements.',
      'Si besoin, recreez un nouveau produit pour les futures operations.'
    ],
    keywords: ['produit supprime', 'historique', 'commande', 'bilan']
  },
  {
    id: 'faq-data-lifecycle',
    tab: 'faq',
    title: 'Ou sont stockees les donnees et comment tout effacer ?',
    summary: 'Les donnees sont locales a l application/appareil.',
    steps: [
      'Les brouillons et donnees valides sont stockes localement.',
      'Utilisez Reinitialiser toutes les donnees pour un effacement propre depuis l app.',
      'Un export JSON est recommande avant toute suppression.',
      'Sur Android, la restauration systeme peut remettre des donnees selon les reglages de sauvegarde.'
    ],
    keywords: ['stockage', 'local', 'reinstaller', 'effacer', 'reset', 'android backup']
  },
  {
    id: 'faq-mobile-pdf-share',
    tab: 'faq',
    title: 'PDF mobile: que se passe-t-il au clic ?',
    summary: 'Le bilan PDF privilegie le partage natif sur mobile.',
    steps: [
      'L app genere le PDF du mois courant.',
      'Sur mobile, ouverture du partage natif (Drive, Fichiers, messagerie, etc.).',
      'Si partage natif indisponible, fallback de telechargement local.'
    ],
    keywords: ['pdf', 'mobile', 'partage', 'download', 'bilan']
  }
];

const normalizeText = (value: string): string => value.trim().toLowerCase();

const matchesSearch = (section: GuideSection, normalizedQuery: string): boolean => {
  if (!normalizedQuery) return true;
  const haystack = [
    section.title,
    section.summary,
    ...section.steps,
    ...(section.tips ?? []),
    ...section.keywords
  ].join(' ').toLowerCase();
  return haystack.includes(normalizedQuery);
};

export const UserGuide: React.FC = () => {
  const [activeTab, setActiveTab] = useState<GuideTab>('start');
  const [query, setQuery] = useState('');
  const normalizedQuery = normalizeText(query);

  const visibleSections = useMemo(() => (
    GUIDE_SECTIONS.filter(section => {
      if (!matchesSearch(section, normalizedQuery)) return false;
      if (normalizedQuery) return true;
      return section.tab === activeTab;
    })
  ), [activeTab, normalizedQuery]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="text-center mb-2">
        <h2 className="text-3xl font-bold text-rose-950 dark:text-rose-100 font-serif mb-2">Guide utilisateur complet</h2>
        <p className="text-stone-500 dark:text-stone-400">
          Reference pas a pas pour debutant: chaque fonctionnalite est documentee.
        </p>
      </div>

      <Card className="p-4">
        <label htmlFor="guide-search" className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">
          Rechercher dans l aide
        </label>
        <div className="flex gap-2">
          <input
            id="guide-search"
            data-testid="guide-search-input"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ex: TVA, production, prix conseille, import, PDF..."
            className="flex-1 px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-600 text-sm bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-rose-100 dark:focus:ring-rose-900 focus:border-[#D45D79] shadow-sm"
          />
          <button
            type="button"
            onClick={() => setQuery('')}
            className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            Effacer
          </button>
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-2">
          {normalizedQuery
            ? `${visibleSections.length} resultat(s) pour "${query}".`
            : 'Astuce: tapez un mot-cle et le guide filtre automatiquement les sections.'}
        </p>
      </Card>

      {!normalizedQuery && (
        <div className="flex justify-center">
          <div className="bg-stone-100 dark:bg-stone-800 p-1 rounded-lg flex overflow-hidden">
            <button
              onClick={() => setActiveTab('start')}
              className={`px-4 py-2 text-sm font-bold ${activeTab === 'start' ? 'bg-white dark:bg-stone-700 rounded-md text-rose-600' : 'text-stone-500'}`}
            >
              Demarrage
            </button>
            <button
              onClick={() => setActiveTab('screens')}
              className={`px-4 py-2 text-sm font-bold ${activeTab === 'screens' ? 'bg-white dark:bg-stone-700 rounded-md text-rose-600' : 'text-stone-500'}`}
            >
              Par ecran
            </button>
            <button
              onClick={() => setActiveTab('faq')}
              className={`px-4 py-2 text-sm font-bold ${activeTab === 'faq' ? 'bg-white dark:bg-stone-700 rounded-md text-rose-600' : 'text-stone-500'}`}
            >
              FAQ
            </button>
          </div>
        </div>
      )}

      {normalizedQuery && (
        <div className="text-xs text-stone-500 dark:text-stone-400 text-center">
          Recherche globale active (toutes les categories).
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {visibleSections.map((section) => (
          <Card key={section.id} className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">{section.title}</h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300">
                {TAB_LABELS[section.tab]}
              </span>
            </div>
            <p className="text-sm text-stone-600 dark:text-stone-300">{section.summary}</p>
            <ol className="list-decimal pl-5 space-y-1 text-sm text-stone-700 dark:text-stone-200">
              {section.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            {section.tips && section.tips.length > 0 && (
              <div className="pt-2 border-t border-stone-200 dark:border-stone-700">
                <p className="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400 mb-1">Bonnes pratiques</p>
                <ul className="list-disc pl-5 space-y-1 text-sm text-stone-600 dark:text-stone-300">
                  {section.tips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        ))}
      </div>

      {visibleSections.length === 0 && (
        <Card data-testid="guide-no-results">
          <p className="text-sm text-stone-600 dark:text-stone-300">
            Aucun resultat pour "{query}". Essayez avec un autre mot-cle (ex: commandes, production, TVA, PDF, import).
          </p>
        </Card>
      )}
    </div>
  );
};

