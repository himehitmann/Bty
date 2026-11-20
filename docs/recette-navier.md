# Récupérer, lancer et tester Navier

Dépôt d’origine [himehitmann/Bty](https://github.com/himehitmann/Bty). Si la branche GitHub contient uniquement le README, récupère l’archive ou le patch depuis **Navier — Sources du projet** dans le navigateur Cloud. L’archive contient directement tout le code de la version testée.

## Avec l’archive

Décompresse **Navier-sources.zip**, puis ouvre un terminal dans le dossier **Navier**. Avec Node.js 22 ou ultérieur :

```sh
npm ci
npm run dev
```

Ouvre `http://localhost:3000`. Le mode local fonctionne sans créer de compte. Le site et le guide se trouvent sur `/decouvrir` et `/installer`.

## Avec le dépôt GitHub et le patch

Télécharge **Navier.patch** avant de lancer les commandes, puis adapte le chemin à son emplacement.

```sh
git clone https://github.com/himehitmann/Bty.git
cd Bty
git switch -c navier-preview
git apply --check "/chemin/vers/Navier.patch"
git apply "/chemin/vers/Navier.patch"
npm ci
npm run dev
```

Ne réapplique pas le patch sur une branche qui contient déjà la version Navier. Une personne disposant des droits d’écriture peut ensuite créer un commit et publier sa branche.

```sh
git add .
git commit -m "Ajouter Navier"
git push -u origin navier-preview
```

## Recette rapide

1. Dans **Ajouter un produit → Catalogue**, essaie le code `3549620008388`. Consulte le nom, le fournisseur et l’INCI s’il est disponible.
2. Ajoute un produit manuellement dans la catégorie **Parfums**. Ouvre sa fiche et repère les états inconnus des deux mentions. Une déclaration manuelle doit inclure sa source.
3. Crée une poudre translucide ou matifiante, puis un fard teinté avec une couleur. Dans une routine, applique les deux à des zones adaptées. La poudre ne doit ajouter aucun pigment. Le fard doit colorer la zone de la routine si une teinte est sélectionnée.
4. Dans **Préférences**, renseigne une observation et un sous-ton. Enregistre puis recharge la page. Choisis un produit de ton vanity dans la trame du matin et crée la routine. Dans son éditeur, renseigne une fréquence issue de la notice ou de ton organisation.
5. Pour tester le service worker, arrête le serveur de développement, lance `npm run build` puis `npm start`, ouvre l’espace une première fois en ligne, puis réessaie hors connexion. L’installation de la PWA et le service worker exigent HTTPS ou localhost.
6. Pour tester les comptes et le journal Plus, suis la configuration Supabase et Stripe test du README. Sans configuration, aucun paiement n’est possible dans l’aperçu.

## Inventaire des fonctions

| Espace | Ce que tu peux faire |
| --- | --- |
| **Catalogue et vanity** | Rechercher par nom ou code-barres. Importer une fiche disponible, ou saisir la tienne. Filtrer et retrouver les produits par catégorie. Gérer soins, maquillage, cheveux et parfums. Enregistrer la marque, l’INCI, une notice disponible, les déclarations avec leurs sources et les dates de conservation. |
| **Compositions** | Lire la provenance, voir quelles données sont inconnues, comparer deux fiches et repérer des libellés INCI communs. Enregistrer des ingrédients à éviter et afficher les correspondances disponibles. |
| **Conservation** | Renseigner l’ouverture, la PAO et la date explicite. Repérer les échéances proches ou dépassées sans déduire la sécurité du produit. |
| **Profil** | Noter son ressenti, ses observations et son sous-ton. Consulter la méthode de comparaison des sous-tons. Préparer une trame matinale avec les produits dont on confirme le rôle. |
| **Routines et tutoriels** | Créer et réordonner des étapes, choisir une zone, une consigne et une fréquence indicative, convertir un tutoriel depuis le vanity et consulter les points de vigilance. Suivre une routine et retrouver le nombre de séances terminées sur les sept derniers jours. |
| **Face Chart et palette** | Explorer les zones et suivre une application guidée. Prélever une couleur d’une photo, nommer et conserver les teintes, puis les réutiliser sur une étape. Les produits transparents ou matifiants ne déposent pas de pigment. |
| **Données et PWA** | Utiliser l’espace local, retrouver les outils hors connexion après un premier chargement, exporter son espace, installer la PWA via le navigateur compatible, ou synchroniser son espace et stocker des photos privées avec Supabase configuré. |
| **Journal Plus** | Noter le ressenti, les produits et la routine du jour, filtrer l’historique et consulter les synthèses. Exporter les observations. Les droits d’écriture dépendent de l’abonnement et sont contrôlés côté serveur. |

La recherche ne couvre pas tous les produits du marché. Le guide du visage montre des zones et des pigments indicatifs. Il n’évalue pas la couleur de ta peau et ne reproduit pas le rendu d’un produit porté.
