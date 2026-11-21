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

1. Dans la barre de recherche, cherche `Huda` puis `Medicube`. Vérifie que les cartes affichent les photos de marque et alignent leurs commandes. Sélectionne **Strawberry Latte** pour **Blush Filter**, puis enregistre la teinte dans **À essayer**. Ajoute une deuxième teinte et vérifie que la même destination est utilisée. Essaie aussi le code `6294018408802`.
2. Ouvre la fiche d’un produit enregistré. Consulte sa provenance et l’INCI s’il est disponible. Repère l’état des mentions végane et cruelty-free selon les données de la source.
3. Dans le Studio, essaie une poudre translucide puis un fard teinté. La poudre n’ajoute aucun pigment. Le fard dépose la couleur sélectionnée sur la zone choisie.
4. Dans **Paramètres**, sélectionne **English** et réduis les animations. Recharge, vérifie les deux réglages puis repasse en **Français**. Depuis l’accueil, clique sur l’illustration d’une carte et vérifie la même action au clavier.
5. Pour tester le service worker, arrête le serveur de développement, lance `npm run build` puis `npm start`, ouvre l’espace une première fois en ligne, puis réessaie hors connexion. L’installation de la PWA et le service worker exigent HTTPS ou localhost.
6. Pour tester les comptes et le journal Plus, suis la configuration Supabase et Stripe test du README. Sans configuration, aucun paiement n’est possible dans l’aperçu.
7. Dans **Simulation maquillage**, compare deux teintes. Déplace le blush, applique le miroir, choisis une zone de fard, une forme de liner et une forme de sourcils. Passe de **Visage nu** à **Look maquillé** pour retrouver tes calques. Essaie aussi un exemple depuis **Styles de maquillage** et prélève une couleur avec l’onglet **Prélever une teinte**.
8. Dans **Mes listes**, crée une liste et ajoute un produit avec une raison. Coche-le, recharge la page, puis retire le produit du vanity pour vérifier que la liste conserve son nom et la raison.
9. Ajoute une étape capillaire à une routine. Choisis les pointes, saisis le nom de la brosse et coche le massage si c’est le geste prévu. Lance la routine et vérifie les informations et le repère visuel.
10. Dans le Studio, compare le blush sur le bombé des joues et en haut des pommettes. Active le guide, puis teste une poudre translucide sous les yeux et le contour de la mâchoire. Enregistre deux teintes sous un même nom de palette et essaie-les depuis le nuancier.
11. Dans le fichier **Navier.html** connecté à Internet, cherche une référence absente de la sélection embarquée. Passe hors connexion et cherche le code `3337875795456` pour vérifier le retour du catalogue embarqué.
12. Dans **Mes looks**, utilise **Enregistrer ce look** et donne-lui un nom. Recharge Navier, sélectionne le look, clique sur **Ouvrir** et compare **Visage nu** et **Look maquillé**. Retire la teinte ou le produit d’origine, puis vérifie que le look conserve la couleur et son placement. Retouche-le et utilise **Enregistrer comme nouveau** pour garder les deux versions. Vérifie leur présence dans le JSON depuis **Paramètres → Exporter mon espace**. Avec Supabase configuré, attends la synchronisation puis ouvre le même compte dans un second navigateur pour vérifier les looks.
13. Cherche `blush`, puis demande les résultats complémentaires. Vérifie que les fiches de marque restent visibles et que les fiches communautaires indiquent leur source. Pose un rouge à lèvres dans le Studio, puis essaie un blush depuis le catalogue. Le rouge à lèvres doit rester affiché.
14. Dans **Profil beauté**, enregistre un prénom ou un pseudo, une observation et un sous-ton. Personnalise la carnation, les yeux et les cheveux du visage du Studio. Recharge puis ouvre le Studio pour retrouver le visage enregistré. Choisis ensuite une trame de routine du soir avec les produits de ta trousse.
15. Cherche `Medicube`, puis ouvre **Voir la fiche** sur **Collagen Night Wrapping Mask**. Vérifie l’INCI et sa source, puis ferme la fiche avec la touche Échap. Sur un produit Huda Beauty, choisis une teinte puis ouvre et ferme la fiche. La teinte reste sélectionnée et la trousse ne change que si tu enregistres le produit.
16. Dans le Studio, applique un fard clair au coin interne et un fard foncé au coin externe. Efface une seule zone et vérifie que l’autre reste visible. Enregistre le look, recharge puis rouvre-le pour vérifier ses fards.
17. Dans **Profil beauté**, ouvre **Faire le point sur ma peau** et renseigne un ressenti et une priorité. Reviens en arrière pour modifier une réponse. Après avoir vérifié le récapitulatif, enregistre, recharge et contrôle les valeurs du profil. Ouvre **Préparer ma routine**, choisis le matin ou le soir et vérifie la confirmation du rôle lorsqu’un soin de la trousse a un nom ambigu.
18. Dans **Tutoriels**, ouvre **Un teint frais**. Choisis un produit pour un geste, passe le suivant et consulte le récapitulatif. Avec une teinte numérique disponible, ouvre le Studio et vérifie que les autres couches du look restent présentes.

## Inventaire des fonctions

| Espace | Ce que tu peux faire |
| --- | --- |
| **Catalogue et trousse** | Rechercher par nom, marque, teinte ou code-barres. Ouvrir la fiche de marque, choisir une variante, l’essayer ou l’enregistrer dans une liste ou la trousse. |
| **Compositions** | Lire la provenance, voir quelles données sont inconnues, comparer deux fiches et repérer des libellés INCI communs. Enregistrer des ingrédients à éviter et afficher les correspondances disponibles. |
| **Conservation** | Consulter les dates d’ouverture, PAO et dates explicites déjà renseignées. Repérer les échéances proches ou dépassées. |
| **Profil** | Choisir un nom affiché et le visage de départ du Studio. Noter son ressenti, ses observations et son sous-ton. Préparer une trame du matin ou du soir avec les produits dont on confirme le rôle. |
| **Routines et tutoriels** | Créer et réordonner des étapes, choisir une zone, une consigne et une fréquence indicative, convertir un tutoriel depuis le vanity et consulter les points de vigilance. Suivre une routine et retrouver le nombre de séances terminées sur les sept derniers jours. |
| **Simulation et Face Chart** | Composer un look sur le visage illustré, choisir sa carnation, essayer et mélanger des couleurs, ajouter plusieurs calques à une même zone et réutiliser une teinte prélevée sur une photo. Les produits transparents ou matifiants ne déposent pas de pigment. |
| **Mes looks** | Enregistrer une composition sous un nom depuis le Studio et la retrouver dans le même navigateur ou avec un compte synchronisé. |
| **Listes et avis** | Organiser les achats et favoris, garder la raison d’une déception et cocher les éléments. Consulter les notes déjà enregistrées sur un produit. |
| **Données et PWA** | Utiliser l’espace local, retrouver les outils hors connexion après un premier chargement, exporter son espace, installer la PWA via le navigateur compatible, ou synchroniser son espace et stocker des photos privées avec Supabase configuré. |
| **Journal Plus** | Noter le ressenti, les produits et la routine du jour, filtrer l’historique et consulter les synthèses. Exporter les observations. Les droits d’écriture dépendent de l’abonnement et sont contrôlés côté serveur. |

La recherche ne couvre pas tous les produits du marché. Le guide du visage montre des zones et des pigments indicatifs. Il n’évalue pas la couleur de ta peau et ne reproduit pas le rendu d’un produit porté.
