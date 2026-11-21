# Navier

Navier est une application web installable pour composer des routines, organiser tes produits et préparer des looks. L’accueil affiche les trois outils dans cet ordre, sur des cartes fixes. Le menu de l’en-tête propose le français, l’anglais, l’espagnol et l’italien.

## Ouvrir Navier par double-clic

Télécharge [**Navier.html**](https://github.com/himehitmann/Bty/releases/latest/download/Navier.html) et double-clique sur le fichier. La recherche consulte Open Beauty Facts avec une connexion. La sélection embarquée reste consultable hors ligne. Pour retrouver les données enregistrées lors d’une mise à jour, remplace l’ancien fichier au même emplacement et ouvre-le avec le même navigateur. **Paramètres → Exporter mon espace** permet de conserver une copie JSON des données.

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

- **Catalogue et Ma trousse** · cherche par nom, marque, teinte ou code-barres. Choisis une variante et essaie-la dans le Studio ou enregistre-la dans la trousse ou dans une liste. Navier retient la dernière destination utilisée.
- **Sources et teintes** · la sélection de marques embarquée propose des liens vers les pages officielles et des couleurs indicatives. Open Beauty Facts complète les recherches sans correspondance fabricante avec ses données sous licence ODbL. Les images produit sont consultables sur le site source. `OPEN_BEAUTY_FACTS_CONTACT` renseigne le contact envoyé par le serveur web. [Open Beauty Facts](https://world.openbeautyfacts.org/data) · [Licence ODbL](https://opendatacommons.org/licenses/odbl/1.0/)
- **Simulation maquillage** · compare deux teintes sur le Face Chart SVG avec les produits de ta trousse, les essais du catalogue et les couleurs prélevées à la pipette. Ajuste le blush ou les sourcils sur le visage et reproduis le placement en miroir. Choisis la forme du liner et la zone du fard.
- **Styles de maquillage** · huit exemples illustrés, de Douyin au liner graphique, avec étapes, sources éditoriales et ouverture du look dans le Studio. **Profil beauté** regroupe les critères de peau et la préparation d’une routine adaptée à tes produits.
- **Mes looks** · dans le Studio, enregistre et rouvre jusqu’à 30 compositions nommées. Le look garde les réglages du portrait, les teintes et leur placement, même après la suppression des produits ou des teintes d’origine. Dans l’espace invité, l’enregistrement dépend du stockage du navigateur. Sur le web, les looks se synchronisent avec le compte lorsque Supabase est configuré. **Paramètres → Exporter mon espace** les inclut dans le JSON.
- **Routines** · création, réorganisation et suivi des étapes, points de vigilance et Face Chart utilisable au clavier. Indique un placement de maquillage, un accessoire, une consigne et, pour les cheveux, la zone et le massage prévu.
- **Mes listes** · **Favoris**, **À essayer** et **Je ne rachète pas** sont proposés dès l’ouverture. Crée aussi tes propres listes, ajoute un produit ou du texte et note pourquoi tu souhaites le garder.
- **Tutoriels** · suggestions à partir du nom et de la catégorie des produits possédés, puis personnalisation avant la création d’une routine.

Les repères INCI concernent les ingrédients déclarés et quelques superpositions. Les données communautaires peuvent être incomplètes ou obsolètes. Les noms seuls ne permettent pas de déterminer une concentration, un pH ou une tolérance. Navier ne fournit aucun diagnostic ni garantie d’innocuité, d’efficacité ou de résultat esthétique.

## Architecture

Next.js App Router fournit la structure serveur, le manifeste et la route catalogue. Les composants interactifs partagent le modèle Zod de `lib/model.ts`. PostgreSQL enregistre le petit espace personnel comme un document JSONB par utilisateur, avec contrôle de taille, isolation RLS et version horodatée. Le front conserve un brouillon local propre à chaque espace. La police [Bricolage Grotesque](public/fonts/bricolage-grotesque-OFL.txt) est hébergée avec l’application et intégrée au fichier portable.

Références techniques · [Next.js App Router](https://nextjs.org/docs/app), [Proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy), [PWA](https://nextjs.org/docs/app/guides/progressive-web-apps), [Tailwind CSS](https://tailwindcss.com/docs/installation/framework-guides/nextjs), [Supabase Auth SSR](https://supabase.com/docs/guides/auth/server-side/nextjs), [Supabase Storage](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl), [Zod](https://zod.dev/api) et [API Open Facts](https://openfoodfacts.github.io/openfoodfacts-server/api/).

## Site et installation

- `/decouvrir` présente l’application. `/installer` propose le guide et déclenche l’invite native lorsque le navigateur la fournit.
- Les dates de conservation déjà enregistrées restent visibles dans **Mes produits**. Le comparateur affiche côte à côte les listes INCI disponibles.
- Les préférences permettent d’exporter les données de l’espace. Le journal conserve un export séparé.

## Offres et Stripe

Le [relevé concurrentiel et tarifaire](docs/veille-navier.md) décrit la proposition Essentiel et Plus. Le journal Plus conserve ses entrées côté serveur. Les règles PostgreSQL contrôlent le droit de créer ou de modifier une entrée. L’utilisateur peut continuer à consulter, exporter ou supprimer les siennes après l’arrêt de Plus.

1. Applique toutes les migrations dans l’ordre. Configure Supabase Auth et ses adresses de retour.
2. Dans Stripe en mode test, crée les deux prix récurrents en EUR, 3,99 € par mois et 29,99 € par an. Renseigne les identifiants dans `.env.local` d’après `.env.example`. `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET` restent strictement côté serveur.
3. Configure le portail Stripe pour les factures et l’annulation. Configure `/api/billing/webhook` pour les événements `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused` et `customer.subscription.resumed`.
4. Essaye l’achat, la réception du webhook, l’activation du journal et la fin des droits dans le bac à sable. Les comptes de test et de production doivent utiliser des clés et des prix distincts. La mise en vente requiert des clés live, l’activation explicite de `NAVIER_BILLING_ALLOW_LIVE` et une configuration SQL live dans `billing_settings`. Utilise un projet Supabase séparé pour la production.

Le [dossier de contrôle de sécurité](docs/securite-navier.md) précise les essais locaux et les validations nécessaires avant une mise en vente.

La [recette locale et GitHub](docs/recette-navier.md) détaille le lancement et les vérifications. Le [relevé des besoins et du catalogue](docs/navier-catalogue-usages.md) explique les sources, les limites et les choix produit.
