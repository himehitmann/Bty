# Contrôles de sécurité Navier

## Contrôles effectués

| Périmètre | Mesures | Vérification |
| --- | --- | --- |
| Interface et HTTP | CSP à nonce par requête, origines réseau et images limitées, protections d’intégration en iframe, rappel d’authentification sans référent | Les quatre pages servies en production ont renvoyé un nonce distinct conforme au HTML. La politique de production exclut `unsafe-eval`. |
| Authentification | Supabase Auth, retour PKCE, cookies Secure sous HTTPS, redirection relative | Inscription, confirmation et connexion vérifiées sur GoTrue et Mailpit locaux. |
| Espace et photos | RLS par propriétaire, taille des états, contrôle de version, stockage des photos privé, liens signés | Accès intercomptes refusés, sauvegardes périmées rejetées et cycle d’une photo vérifié sur la pile Supabase locale. Contraintes renforcées exercées dans PostgreSQL embarqué. |
| Journal | Table distincte, délimitation par propriétaire, droit d’écriture Plus contrôlé par PostgreSQL | Les tests SQL ont couvert l’accès et l’écriture avec Plus, le refus sans Plus, l’isolation des comptes et la conservation de la lecture et de la suppression après arrêt. |
| Facturation | Origine validée, session authentifiée, prix Stripe vérifiés côté serveur, webhooks signés, séparation test/live, concurrence des mises à jour | Routes HTTP exercées avec signatures de test. Tests SQL sur expiration, accès intercomptes, versions de réconciliation et séparation des modes. |
| Catalogue | URL publique fixe, entrées bornées, délai, volume plafonné, cache borné et repli local | Cas réel Open Beauty Facts, limitation des réponses et repli vérifiés. La limite de concurrence s’applique par instance. |
| Dépendances | Lockfile npm, Stripe SDK officiel | L’audit npm n’a signalé aucune vulnérabilité connue au moment du contrôle. |

## Validation avant mise en vente

L’achat hébergé et le portail restent à parcourir avec un vrai environnement Stripe sandbox et un projet Supabase dédié. Il faut vérifier la confirmation d’abonnement, l’annulation, l’expiration des droits, les factures et le fonctionnement du SMTP de production. L’identité de l’exploitant, ses coordonnées, la politique de conservation et les conditions de vente devront être définies pour compléter les informations du site. Le déploiement réel et un audit indépendant sortent du périmètre des essais locaux.
