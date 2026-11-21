# Contrôles de sécurité Navier

## Contrôles effectués

| Périmètre | Mesures | Vérification |
| --- | --- | --- |
| Interface et HTTP | CSP à nonce par requête sur le web, empreintes du JavaScript et de la feuille de style sur le fichier portable, origines réseau et images limitées, protections d’intégration en iframe | Nonces distincts et politique de production sans `unsafe-eval`. Le fichier portable s’ouvre dans Chromium avec ses ressources autorisées. |
| Authentification | Authentification HTTPS, HTTP réservé au bouclage, cookies `SameSite=Lax` et `Secure` sous HTTPS, retour PKCE, réinitialisation via un lien Supabase et redirection relative sans référent | GoTrue, PostgreSQL et Mailpit locaux ont couvert la confirmation d’adresse et la réinitialisation, avec rejet de l’ancien mot de passe et connexion avec le nouveau. Les retours mal formés restent sans session. La compilation refuse les clés privilégiées sans afficher leur valeur. |
| Espace et photos | RLS par propriétaire, écritures limitées aux colonnes utilisées, taille des états, contrôle de version, stockage privé, liens signés | Les essais PostgreSQL vérifient les refus intercomptes et les sauvegardes périmées. Un état JSONB réordonné reste reconnu comme identique après une sauvegarde confirmée. |
| Journal | Table distincte, délimitation par propriétaire, droit d’écriture Plus contrôlé par PostgreSQL | Les tests SQL ont couvert l’accès et l’écriture avec Plus, le refus sans Plus, l’isolation des comptes et la conservation de la lecture et de la suppression après arrêt. |
| Facturation | Origine et compte validés, prix Stripe contrôlés, session de paiement rattachée avant redirection, webhooks signés et dédupliqués, séparation test/live | Routes exercées avec le SDK Stripe, signatures de test et services simulés. Essais PostgreSQL sur la déduplication, le traitement des reprises et des notifications tardives, et l’isolation des comptes. |
| Catalogue | URL publique fixe, entrées et champs bornés, taille et délais limités, UTF-8 valide, correspondance exacte du code-barres, cache borné | Cas réel Open Beauty Facts et rejets de données invalides vérifiés. La limite de concurrence s’applique par instance. |
| Dépendances | Lockfile npm, Stripe SDK officiel | L’audit npm n’a signalé aucune vulnérabilité connue au moment du contrôle. |

## Validation avant mise en vente

Applique toutes les migrations à un projet Supabase dédié. Vérifie le paiement et le portail dans un bac à sable Stripe avec ce projet, ainsi que l’annulation, l’expiration des droits, les factures et l’envoi des e-mails avec le SMTP de production. L’identité de l’exploitant, ses coordonnées, la politique de conservation et les conditions de vente devront être définies pour compléter les informations du site. Le déploiement réel et un audit indépendant sortent du périmètre des essais locaux.
