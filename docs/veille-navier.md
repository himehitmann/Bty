# Veille concurrentielle Navier

Relevé du 20 novembre 2026. Les tarifs ci-dessous sont les achats intégrés affichés dans la vitrine française lorsque la source est l’App Store. Certaines références peuvent correspondre à des promotions ou à des offres anciennes. Le prix actif se vérifie au moment de souscrire.

## Marché français et comparables

| Outil | Fonctions observées | Prix repérés |
| --- | --- | --- |
| [QuelProduit](https://www.quechoisir.org/application-mobile-quelproduit-n84731/) | Décryptage des cosmétiques et de produits du quotidien | Gratuit |
| [Yuka](https://apps.apple.com/fr/app/yuka-scan-de-produits/id1092799236) | Scan et évaluation simplifiée des compositions | 15 €/an affichés sur iOS. [L’aide Yuka](https://help.yuka.io/l/fr/article/hkzw2hkj5w-prix-adhesion) annonce un prix à partir de 10 €/an |
| [INCI Beauty](https://apps.apple.com/fr/app/inci-beauty-scan-cosm%C3%A9tiques/id1276113963) | Scan, INCI, espaces de rangement et routines | 14,99 €/an |
| [Vani](https://apps.apple.com/fr/app/vani-routine-skincare/id6761888927) | Inventaire soin, maquillage et cheveux, dates, routines et compatibilité | 20 produits gratuits, 2,99 €/mois, 19,99 €/an ou 89,99 € à vie |
| [Tenim](https://apps.apple.com/fr/app/tenim-carnet-de-cosm%C3%A9tiques/id6811031621) | Inventaire, Open Beauty Facts, rappels, routines et traçabilité | 5,99 €/mois ou 34,99 €/an |
| [Skin Bliss](https://apps.apple.com/fr/app/skin-bliss-analyse-cosm%C3%A9tique/id1385561364) | Routine Player, superposition, suivi et journal | Achats listés dont 4,99 €/mois et 24,99 €/an |
| [Palette Privée](https://apps.apple.com/fr/app/palette-privee/id6759579977) | Collection, budget et réduction du gaspillage | 2,99 €/mois, 27,99 €/an ou 74,99 € à vie |
| [SkinSort](https://apps.apple.com/fr/app/skinsort-the-skincare-app/id6478040418) | Collection, compatibilité et recherche par préférences | Références listées de 8,99 à 14,99 €/mois et de 22,99 à 49,99 €/an |
| [FeelinMySkin](https://apps.apple.com/fr/app/skincare-routine-feelinmyskin/id1526044677) | Planification et suivi des routines | Références listées de 4,99 à 8,99 €/mois et de 18,99 à 39,99 €/an |
| [Skincare Routine de Mento](https://apps.apple.com/fr/app/skincare-routine/id1428570992) | Ordre, superposition et rappels | Achat de l’app à 3,99 € |
| [Vanity](https://apps.apple.com/fr/app/vanity-maquillage-skincare/id6810189385) | Inventaire maquillage et soin, péremption | 5,99 €/mois ou 49,99 €/an |
| [Vannie](https://apps.apple.com/fr/app/inventaire-maquillage-vannie/id6761738695?platform=ipad) | Suivi d’utilisation, dates et Project Pan | 9,99 €/mois ou 59,99 €/an |

Deux comparables visuels complètent le relevé. Face Chart – Makeup Guru offre un outil de dessin du maquillage et affiche un achat à 5,99 € pour retirer les publicités. ShadeMirror prélève une teinte à partir d’une photo pour l’utiliser dans un essayage virtuel. Les fonctions prises séparément existent sur le marché. [Face Chart – Makeup Guru](https://apps.apple.com/fr/app/face-chart-makeup-guru/id6463616121) · [ShadeMirror](https://app.metaimax.com/en/index.html)

## Choix produit

- **Navier relie les étapes d’un même usage.** Choisir un tutoriel avec ce que je possède, enregistrer la routine, puis visualiser la zone du geste sur le Face Chart. Ce parcours sert de démonstration sur le site.
- **Repères d’ouverture gratuits.** L’utilisateur indique la date et la PAO imprimée sur l’emballage, ou renseigne une date explicite. Navier affiche le premier repère disponible. Aucune durée générique ne remplace l’étiquette.
- **Comparaison INCI gratuite.** Deux produits du vanity, listes et provenance côte à côte, ingrédients communs, état des données manquantes. Une correspondance d’ingrédients ne conclut rien sur la concentration, la tolérance ou l’équivalence des formules.
- **Journal Plus.** Un point quotidien, des produits et routines associés, des observations personnelles et un historique. La synthèse aide à retrouver ses propres observations. Elle ne déduit aucune causalité.
- **Portabilité gratuite.** Export de l’espace dans les préférences. Les entrées du journal restent lisibles, exportables et supprimables après l’arrêt de Plus. Les fichiers photo ne sont pas inclus dans les exports JSON.
- **Écartés à ce stade.** Essayage facial par caméra, scores d’innocuité, recommandations médicales et boutique de produits. Ces fonctions ne sont pas nécessaires au parcours choisi.

## Tarification proposée

**Essentiel gratuit.** Vanity, dates, comparaison INCI, routines, Face Chart, palette, tutoriels, mode local et synchronisation de l’espace une fois Supabase configuré.

**Plus à 3,99 €/mois ou 29,99 €/an.** Création et modification des entrées du journal privé, historique filtrable et synthèses. L’annuel représente environ 37 % de moins que douze mensualités. Ce prix se place entre les offres annuelles repérées de Vani et Tenim. Il reste une hypothèse commerciale, à mesurer sur la réutilisation des routines et du journal avant une mise en vente.

Le paiement hébergé, la gestion de l’abonnement et le contrôle d’accès sont prévus par la configuration de Stripe et de Supabase. Aucun paiement réel n’est activé par défaut.
