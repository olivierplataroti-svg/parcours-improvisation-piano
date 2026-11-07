# Mon écoute intérieure

Application personnelle de pratique musicale en 36 paliers, issue du programme d’écoute intérieure d’Olivier. Elle complète les parcours blues, jazz et bases de l’improvisation.

## Utilisation

- Choisir un palier dans **Mon parcours** et ouvrir une **Séance guidée**.
- Travailler 10 à 15 minutes, puis consigner la durée, les résultats, l’aide utilisée et les notes personnelles.
- Ajouter une séance optionnelle ou une séance libre si nécessaire.
- Utiliser **Atelier d’écoute** pour les modèles sonores simples, la discrimination de direction, la lecture intérieure et la saisie au clavier.
- Garder régulièrement une sauvegarde JSON, notamment pour transférer la pratique entre OpenAI et GitHub Pages.

## Fonctions

Tableau de bord, suivi par palier et par phase, édition des consignes et des séances, chronomètre persistant, historique éditable, séances libres et optionnelles, journal, banque de motifs, suivi majeur/mineur des tonalités, bilans datés des cinq objectifs, thème clair/sombre, export JSON/CSV et import avec fusion ou remplacement. Les 36 fiches du parcours et les sources pédagogiques sont intégrées. Le PDF personnalisé est conservé uniquement dans la version OpenAI privée.

Le programme reste accessible entièrement. Les critères chiffrés proposent un repère ; la validation d’un palier est une décision explicite. Les réussites avec aide et les problèmes techniques sont distingués.

L’atelier sonore apporte des supports simples pour tous les paliers et ne remplace pas les sous-étapes détaillées du programme. Le chant est autoévalué : aucun microphone ni analyse automatique de justesse n’est utilisé. Les sons sont synthétisés localement.

## Données

La pratique est enregistrée dans le stockage local du navigateur, sous une clé propre à cette application. Le journal ne crée pas de minutes supplémentaires ; les totaux proviennent uniquement des séances terminées. Une fusion reconnaît les identifiants existants et ne double pas les séances. Les origines OpenAI et GitHub Pages disposent de stockages séparés : un export/import JSON assure le transfert.

Le dépôt contient le code et les consignes des 36 paliers, sans PDF personnalisé ni données de pratique personnelles. L’application peut être ajoutée à l’écran d’accueil de l’iPad. Un cache local permet la consultation hors connexion après une première ouverture réussie.

## Développement et vérification

Application HTML/CSS/JavaScript statique sans dépendance d’exécution. Les fichiers servis se trouvent dans `dist/`. Pour GitHub Pages, leur copie est placée dans un dossier `ecoute-interieure/` du dépôt des parcours piano.

```sh
npm test
npm run check
```

Les tests portent sur la couverture des 36 paliers, le comptage des séances et des minutes, les critères différés, les imports et les fusions, les dates et scores invalides, les modèles sonores et le chronomètre. Les flux principaux ont aussi été vérifiés dans le navigateur de prévisualisation.

Références : GIML / Gordon, OAKE / Kodály et documentation EarMaster. La progression en 36 paliers et les seuils sont une proposition pédagogique personnalisée, documentée dans les fiches du parcours.
