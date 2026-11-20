# Navier

Navier est une PWA de gestion du vanity et de routines beauté. L’interface est en français et s’adapte aux écrans mobiles. Le mode local permet de démarrer sans compte avec des produits et routines fictifs, que l’on peut retirer dans les préférences.

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

Le service worker s’active dans la version de production sur HTTPS ou sur localhost. Après une première ouverture en ligne, il conserve l’interface et les ressources publiques pour le mode hors connexion. La recherche distante, l’authentification et les opérations Storage utilisent le réseau.

## Activer Supabase

1. Applique [la migration initiale](supabase/migrations/20261120000000_init.sql) à un projet Supabase PostgreSQL, par exemple via `supabase db push` sur un projet lié, ou via l’éditeur SQL.
2. Copie `.env.example` vers `.env.local` et remplis `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Ces paramètres sont publics et les droits reposent sur les politiques RLS. Garde les clés privilégiées hors de l’application.
3. Dans **Authentication → URL Configuration**, configure la Site URL et autorise `http://localhost:3000/auth/confirm` ainsi que l’équivalent HTTPS du domaine de production. Active la confirmation d’adresse si nécessaire. Le callback accepte le flux PKCE par `code`. Pour un modèle personnalisé par jeton, utilise `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`.
4. Redémarre le serveur en développement ou reconstruis l’application en production après avoir configuré les variables publiques. Connecte-toi, ajoute un produit et rouvre le même compte dans un autre navigateur pour vérifier la synchronisation.

Chaque compte démarre avec un espace vide. L’espace invité reste sur le navigateur qui l’a créé. La synchronisation refuse de remplacer silencieusement une version plus récente et garde un brouillon local en cas d’échec. Les photos peuvent rester sur l’appareil le temps du prélèvement ou être enregistrées sur choix de l’utilisateur dans un bucket privé par compte. Leur lecture passe par des liens temporaires.

## Fonctionnement

- **Vanity** · ajout par code-barres, nom ou saisie manuelle, filtres par catégorie, édition et suppression. Les routines perdent les étapes d’un produit supprimé.
- **INCI** · affichage de la liste et de sa provenance. La recherche combine [Open Beauty Facts](https://world.openbeautyfacts.org/) avec un catalogue local de formules illustratives. `OPEN_BEAUTY_FACTS_CONTACT` permet de renseigner le contact envoyé dans le User-Agent.
- **Routines** · création, réorganisation et suivi des étapes, Face Chart SVG utilisable au clavier et points de vigilance sur les listes et leur ordre.
- **Palette** · prélèvement précis sur une photo via Canvas, aperçu des couleurs dominantes et sauvegarde des codes hexadécimaux. L’éclairage et l’écran influencent les résultats.
- **Tutoriels** · suggestions à partir du nom et de la catégorie des produits possédés, puis personnalisation avant la création d’une routine.

Les repères INCI concernent les ingrédients déclarés et quelques superpositions. Les données communautaires peuvent être incomplètes ou obsolètes. Les noms seuls ne permettent pas de déterminer une concentration, un pH ou une tolérance. Navier ne fournit aucun diagnostic ni garantie d’innocuité, d’efficacité ou de résultat esthétique.

## Architecture

Next.js App Router fournit la structure serveur, le manifeste et la route catalogue. Les composants interactifs partagent le modèle Zod de `lib/model.ts`. PostgreSQL enregistre le petit espace personnel comme un document JSONB par utilisateur, avec contrôle de taille, isolation RLS et version horodatée. Le front conserve un brouillon local propre à chaque espace. Les ressources créées pour Navier et les polices [DM Sans](public/fonts/dm-sans-OFL.txt) et [Playfair Display](public/fonts/playfair-OFL.txt) sont hébergées avec l’application.

Références techniques · [Next.js App Router](https://nextjs.org/docs/app), [Proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy), [PWA](https://nextjs.org/docs/app/guides/progressive-web-apps), [Tailwind CSS](https://tailwindcss.com/docs/installation/framework-guides/nextjs), [Supabase Auth SSR](https://supabase.com/docs/guides/auth/server-side/nextjs), [Supabase Storage](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl), [Zod](https://zod.dev/api) et [API Open Facts](https://openfoodfacts.github.io/openfoodfacts-server/api/).
