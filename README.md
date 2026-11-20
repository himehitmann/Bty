# Navier

Navier est une application web installable pour simuler un maquillage, composer des routines et organiser tes produits dans des listes personnelles. L’accueil présente ces outils en cartes à faire défiler. Un nouvel espace démarre vide. Les boutons **FR** et **EN** sont dans l’en-tête.

## Ouvrir Navier par double-clic

Télécharge **Navier.html** dans la [dernière version GitHub](https://github.com/himehitmann/Bty/releases/latest) et double-clique sur le fichier. L’édition portable utilise un catalogue embarqué et conserve tes données dans le navigateur. Pour mettre à jour le fichier tout en gardant les données enregistrées dans le navigateur, remplace l’ancien fichier au même emplacement. **Paramètres → Exporter mon espace** permet de conserver une copie JSON des données.

## Démarrer

Prérequis · Node.js 22 ou ultérieur et npm.

```sh
npm ci
npm run dev
```

Ouvre `http://localhost:3000`. Pour vérifier et lancer la version de production :

```sh
npm run typecheck
npm run build
npm start
```

Pour générer le fichier portable à partir de cette branche, exécute `npm run build:portable`. Le résultat se trouve dans `out/Navier.html`.

GitHub Actions vérifie TypeScript et compile l’application à chaque envoi sur `codex/navier`. Lorsque ces étapes réussissent, le [workflow de publication](.github/workflows/navier-portable.yml) génère le fichier portable et le publie dans [Releases](https://github.com/himehitmann/Bty/releases). Le [lien direct](https://github.com/himehitmann/Bty/releases/latest/download/Navier.html) suit la dernière version publiée.

Le service worker s’active dans la version de production sur HTTPS ou sur localhost. Après une première ouverture en ligne, il conserve l’interface et les ressources publiques pour le mode hors connexion. La recherche distante, l’authentification et les opérations Storage utilisent le réseau.

## Activer Supabase

1. Applique [la migration initiale](supabase/migrations/20261120000000_init.sql) à un projet Supabase PostgreSQL, par exemple via `supabase db push` sur un projet lié, ou via l’éditeur SQL.
2. Copie `.env.example` vers `.env.local` et remplis `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Ces paramètres sont publics et les droits reposent sur les politiques RLS. Garde les clés privilégiées hors de l’application.
3. Dans **Authentication → URL Configuration**, configure la Site URL et autorise `http://localhost:3000/auth/confirm` ainsi que l’équivalent HTTPS du domaine de production. Active la confirmation d’adresse si nécessaire. Pour envoyer les confirmations aux utilisateurs d’un projet hébergé, configure un [serveur SMTP personnalisé](https://supabase.com/docs/guides/auth/auth-smtp). Le callback accepte le flux PKCE par `code`. Pour un modèle personnalisé par jeton, utilise `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`.
4. Redémarre le serveur en développement ou reconstruis l’application en production après avoir configuré les variables publiques. Connecte-toi, ajoute un produit et rouvre le même compte dans un autre navigateur pour vérifier la synchronisation.

Chaque compte démarre avec un espace vide. L’espace invité reste sur le navigateur qui l’a créé. La synchronisation refuse de remplacer silencieusement une version plus récente et garde un brouillon local en cas d’échec. Les photos peuvent rester sur l’appareil le temps du prélèvement ou être enregistrées sur choix de l’utilisateur dans un bucket privé par compte. Leur lecture passe par des liens temporaires.

## Fonctionnement

- **Mes produits** · recherche par nom, marque ou code-barres depuis l’en-tête ou le **Catalogue**, puis ajout dans la page. Tu peux noter un achat, un favori, un avis et les raisons à retenir. Les routines perdent les étapes d’un produit supprimé.
- **INCI** · affichage de la liste et de sa provenance. La version web interroge [Open Beauty Facts](https://world.openbeautyfacts.org/). Le catalogue embarqué contient quelques références réelles issues d’Open Beauty Facts sous [licence ODbL](https://opendatacommons.org/licenses/odbl/1-0/), avec un lien par fiche, ainsi que des formules clairement signalées comme indicatives. `OPEN_BEAUTY_FACTS_CONTACT` permet de renseigner le contact envoyé dans le User-Agent.
- **Simulation maquillage** · Face Chart SVG original avec carnation, couleur des yeux et des cheveux, calques par type de maquillage, intensité et mélange de teintes. L’onglet photo prélève une couleur avec Canvas pour la réutiliser dans un look ou une routine.
- **Routines** · création, réorganisation et suivi des étapes, points de vigilance et Face Chart utilisable au clavier. Indique un accessoire, une consigne et, pour les cheveux, la zone et le massage prévu.
- **Mes listes** · listes à nom libre pour les favoris, les achats, une trousse ou les déceptions. Ajoute un produit ou du texte, note la raison et coche les éléments au fur et à mesure.
- **Tutoriels** · suggestions à partir du nom et de la catégorie des produits possédés, puis personnalisation avant la création d’une routine.

Les repères INCI concernent les ingrédients déclarés et quelques superpositions. Les données communautaires peuvent être incomplètes ou obsolètes. Les noms seuls ne permettent pas de déterminer une concentration, un pH ou une tolérance. Navier ne fournit aucun diagnostic ni garantie d’innocuité, d’efficacité ou de résultat esthétique.

## Architecture

Next.js App Router fournit la structure serveur, le manifeste et la route catalogue. Les composants interactifs partagent le modèle Zod de `lib/model.ts`. PostgreSQL enregistre le petit espace personnel comme un document JSONB par utilisateur, avec contrôle de taille, isolation RLS et version horodatée. Le front conserve un brouillon local propre à chaque espace. Les polices [Geist](public/fonts/geist-OFL.txt) et [Instrument Serif](public/fonts/instrument-serif-OFL.txt) sont hébergées avec l’application et intégrées au fichier portable.

Références techniques · [Next.js App Router](https://nextjs.org/docs/app), [Proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy), [PWA](https://nextjs.org/docs/app/guides/progressive-web-apps), [Tailwind CSS](https://tailwindcss.com/docs/installation/framework-guides/nextjs), [Supabase Auth SSR](https://supabase.com/docs/guides/auth/server-side/nextjs), [Supabase Storage](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl), [Zod](https://zod.dev/api) et [API Open Facts](https://openfoodfacts.github.io/openfoodfacts-server/api/).

## Site et installation

- `/decouvrir` présente l’application. `/installer` propose le guide et déclenche l’invite native lorsque le navigateur la fournit.
- Le vanity accepte une date d’ouverture, la PAO imprimée et une date explicite. Le repère affiché est le plus proche parmi les dates connues. Le comparateur affiche côte à côte les listes INCI disponibles.
- Les préférences permettent d’exporter les données de l’espace. Le journal conserve un export séparé.

## Offres et Stripe

Le [relevé concurrentiel et tarifaire](docs/veille-navier.md) décrit la proposition Essentiel et Plus. Le journal Plus conserve ses entrées côté serveur. Les règles PostgreSQL contrôlent le droit de créer ou de modifier une entrée. L’utilisateur peut continuer à consulter, exporter ou supprimer les siennes après l’arrêt de Plus.

1. Applique toutes les migrations dans l’ordre. Configure Supabase Auth et ses adresses de retour.
2. Dans Stripe en mode test, crée les deux prix récurrents en EUR, 3,99 € par mois et 29,99 € par an. Renseigne les identifiants dans `.env.local` d’après `.env.example`. `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET` restent strictement côté serveur.
3. Configure le portail Stripe pour les factures et l’annulation. Configure `/api/billing/webhook` pour les événements `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused` et `customer.subscription.resumed`.
4. Essaye l’achat, la réception du webhook, l’activation du journal et la fin des droits dans le bac à sable. Les comptes de test et de production doivent utiliser des clés et des prix distincts. La mise en vente requiert des clés live, l’activation explicite de `NAVIER_BILLING_ALLOW_LIVE` et une configuration SQL live dans `billing_settings`. Utilise un projet Supabase séparé pour la production.

Le [dossier de contrôle de sécurité](docs/securite-navier.md) précise les essais locaux et les validations nécessaires avant une mise en vente.

La [recette locale et GitHub](docs/recette-navier.md) détaille le lancement et les vérifications. Le [relevé des besoins et du catalogue](docs/navier-catalogue-usages.md) explique les sources, les limites et les choix produit.
