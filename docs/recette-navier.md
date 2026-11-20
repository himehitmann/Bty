# Récupérer, lancer et tester Navier

## Ouvrir le fichier portable

Télécharge [**Navier.html**](https://github.com/himehitmann/Bty/releases/latest/download/Navier.html), puis double-clique sur le fichier. Une connexion permet de chercher dans Open Beauty Facts. La sélection embarquée fonctionne hors ligne. L’espace personnel reste dans le navigateur utilisé.

## Depuis le code source

Le code est sur la [branche codex/navier du dépôt](https://github.com/himehitmann/Bty/tree/codex/navier). Avec Node.js 22 ou ultérieur :

```sh
git clone --branch codex/navier https://github.com/himehitmann/Bty.git
cd Bty
npm ci
npm run dev
```

Ouvre `http://localhost:3000` tant que le serveur tourne. Le site et le guide d’installation se trouvent sur `/decouvrir` et `/installer`. Pour générer le fichier à ouvrir par double-clic, lance `npm run build:portable` puis ouvre `out/Navier.html`.

## Recette rapide

1. Dans la barre de recherche de l’en-tête, cherche `Huda`, `Cicaplast` ou le code `3337875795456`. Vérifie le nom, la marque et la photo lorsque la source en propose une. Enregistre un produit et retrouve-le dans **Mes produits**.
2. Ouvre la fiche d’un produit enregistré. Consulte sa provenance et l’INCI s’il est disponible. Repère l’état des mentions végane et cruelty-free selon les données de la source.
3. Dans le Studio, essaie une poudre translucide puis un fard teinté. La poudre n’ajoute aucun pigment. Le fard dépose la couleur sélectionnée sur la zone choisie.
4. Dans le menu des langues de l’en-tête, sélectionne **English**, recharge la page, puis repasse en **Français**. Dans **Paramètres**, renseigne une observation et un sous-ton, puis prépare une trame du matin à partir de tes produits.
5. Pour tester le service worker, arrête le serveur de développement, lance `npm run build` puis `npm start`, ouvre l’espace une première fois en ligne, puis réessaie hors connexion. L’installation de la PWA et le service worker exigent HTTPS ou localhost.
6. Pour tester les comptes et le journal Plus, suis la configuration Supabase et Stripe test du README. Sans configuration, aucun paiement n’est possible dans l’aperçu.
7. Depuis **Simulation maquillage**, change la carnation, puis superpose le fard et l’eyeliner dans la zone des yeux. Prélève une nuance via l’onglet photo et applique-la sur une zone du visage.
8. Dans **Mes listes**, crée une liste et ajoute un produit avec une raison. Coche-le, recharge la page, puis retire le produit du vanity pour vérifier que la liste conserve son nom et la raison.
9. Ajoute une étape capillaire à une routine. Choisis les pointes, saisis le nom de la brosse et coche le massage si c’est le geste prévu. Lance la routine et vérifie les informations et le repère visuel.
10. Dans le Studio, compare le blush sur le bombé des joues et en haut des pommettes. Active le guide, puis teste une poudre translucide sous les yeux et le contour de la mâchoire. Enregistre deux teintes sous un même nom de palette et essaie-les depuis le nuancier.
11. Dans le fichier **Navier.html** connecté à Internet, cherche une référence absente de la sélection embarquée. Passe hors connexion et cherche le code `3337875795456` pour vérifier le retour du catalogue embarqué.

## Inventaire des fonctions

| Espace | Ce que tu peux faire |
| --- | --- |
| **Catalogue et vanity** | Rechercher par nom, marque ou code-barres. Identifier les produits grâce aux photos disponibles et les enregistrer en un clic. Filtrer soins, maquillage, cheveux et parfums dans **Mes produits**. |
| **Compositions** | Lire la provenance, voir quelles données sont inconnues, comparer deux fiches et repérer des libellés INCI communs. Enregistrer des ingrédients à éviter et afficher les correspondances disponibles. |
| **Conservation** | Consulter les dates d’ouverture, PAO et dates explicites déjà renseignées. Repérer les échéances proches ou dépassées. |
| **Profil** | Noter son ressenti, ses observations et son sous-ton. Consulter la méthode de comparaison des sous-tons. Préparer une trame matinale avec les produits dont on confirme le rôle. |
| **Routines et tutoriels** | Créer et réordonner des étapes, choisir une zone, une consigne et une fréquence indicative, convertir un tutoriel depuis le vanity et consulter les points de vigilance. Suivre une routine et retrouver le nombre de séances terminées sur les sept derniers jours. |
| **Simulation et Face Chart** | Composer un look sur le visage illustré, choisir sa carnation, essayer et mélanger des couleurs, ajouter plusieurs calques à une même zone et réutiliser une teinte prélevée sur une photo. Les produits transparents ou matifiants ne déposent pas de pigment. |
| **Listes et avis** | Organiser les achats et favoris, garder la raison d’une déception et cocher les éléments. Consulter les notes déjà enregistrées sur un produit. |
| **Données et PWA** | Utiliser l’espace local, retrouver les outils hors connexion après un premier chargement, exporter son espace, installer la PWA via le navigateur compatible, ou synchroniser son espace et stocker des photos privées avec Supabase configuré. |
| **Journal Plus** | Noter le ressenti, les produits et la routine du jour, filtrer l’historique et consulter les synthèses. Exporter les observations. Les droits d’écriture dépendent de l’abonnement et sont contrôlés côté serveur. |

La recherche ne couvre pas tous les produits du marché. Le guide du visage montre des zones et des pigments indicatifs. Il n’évalue pas la couleur de ta peau et ne reproduit pas le rendu d’un produit porté.
