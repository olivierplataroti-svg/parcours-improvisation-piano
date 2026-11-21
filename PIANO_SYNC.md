# Synchronisation du suivi Piano

Les quatre applications transmettent leur suivi à un projet Supabase commun.
Le tableau de bord reçoit les données à l'ouverture, au retour sur l'onglet et
toutes les 30 secondes lorsqu'il reste visible. Les applications sources gardent
leur stockage local et leurs fonctions habituelles.

## Première activation sur l'iPad

1. Dans le projet `piano-olivier-sync` de Supabase, ouvrir **Authentication → Users**.
2. Choisir **Add user → Create new user**. Renseigner son adresse e-mail et un mot
   de passe pour l'accès Piano. Laisser **Auto Confirm User** activé. Ce compte
   applicatif est distinct du compte de gestion Supabase, même avec le même e-mail.
3. Ouvrir chacune des quatre applications depuis **son icône existante**, sans la
   supprimer ni la réinstaller. Si nécessaire, fermer puis rouvrir l'application
   pour charger sa mise à jour.
4. Toucher **☁ Connecter mon suivi**, saisir le même accès Piano et attendre
   **Suivi synchronisé**. L'historique local de cette installation est envoyé.
5. Faire la même connexion dans le tableau de bord. Il indique les parcours reçus.

Les mots de passe ne sont jamais écrits dans GitHub ni conservés par le module.
Les sessions Supabase restent dans le stockage de chaque application.

## Périmètre et fonctionnement

- Une coupure réseau conserve les changements localement. La transmission reprend
  quand l'application est rouverte avec Internet ; aucune exécution en arrière-plan
  d'une application fermée sur iPad n'est supposée.
- Seules les quatre clés de suivi connues sont lues ; aucun autre stockage Safari,
  aucune clé d'authentification et aucun mot de passe n'est envoyé comme suivi.
- Chaque installation possède un identifiant. Ses instantanés sont conservés à part.
  Le tableau de bord fusionne les identifiants de séances, sans additionner deux
  copies d'une même séance. Les changements observés après installation du module
  ont une date par séance ; les suppressions possèdent des marqueurs.
- L'heure de modification antérieure à l'activation est inconnue (valeur 0).
  Deux copies initiales divergentes d'une même séance terminée sont départagées
  par leur réception. Un état par défaut non terminé ne remplace pas une séance
  terminée. Une modification observée ensuite prévaut sur ces copies initiales.
- Le tableau de bord reçoit le suivi : le module ne remplace jamais les données
  locales des applications sources par des données téléchargées. Sur un autre
  appareil, le tableau de bord peut consulter le suivi reçu ; une restauration
  du parcours complet dans une application source reste une opération distincte.
- Le répertoire classique et les réglages personnels du tableau de bord restent
  locaux. Le calcul classique de 1 h par journée piano active et la séparation
  de l'écoute intérieure sont conservés.

## Maintenance

Projet : `bwsqextibrjbunlpdwok`, région Paris. Table `public.piano_snapshots`.
La clé du navigateur est une clé **publishable**. Les accès sont protégés par
Supabase Auth et des règles RLS limitées au propriétaire. La fonction de publication
est `SECURITY INVOKER` et rejette les révisions arrivées en retard.

Le schéma est versionné dans `supabase/piano_sync.sql`. Le SDK Supabase JS est
vendu localement en version fixe **2.95.3**, avec sa licence MIT. Les trois dépôts
portent la même version de `piano-sync.js` et du SDK pour fonctionner indépendamment.
Le service worker de l'écoute intérieure conserve aussi ces ressources hors ligne.

Tests : `node --test tests/piano-cloud-core.test.cjs tests/piano-cloud-runtime.test.cjs`.
Les chemins des tests publiés doivent pointer vers `../piano-sync.js` et
`../tableau-de-bord-piano/index.html`.

L'offre gratuite Supabase peut mettre le projet en pause après une période de
faible activité. Le suivi local reste utilisable ; reprendre le projet dans
Supabase puis rouvrir les applications rétablit les transmissions.


## Vocabulaire — novembre 2026

Le module v1.1.0 ajoute une cinquième source, `vocab`, au tableau de bord. Utiliser le même accès Piano dans Vocabulaire et dans le tableau de bord. Les autres apps conservent leur format et leur connexion.

Vocabulaire transmet une projection minimale : identifiant et date des séances, minutes au piano et hors piano, méthode majeure/mineure ou lick personnel, validation, dates de modification/suppression et compteurs de progression. Les liens Drive, supports, notes, descriptions des licks et profils ne sont pas transmis. La synchronisation est destinée au tableau de bord ; elle ne remplace pas la sauvegarde complète pour transférer l’app source entre Sites et GitHub.

Une séance mixte garde un seul identifiant, même si elle est liée à plusieurs licks. Les graphiques affectent chaque durée à sa catégorie. Une séance purement hors piano n’ajoute ni temps au clavier, ni journée active au piano, ni heure classique estimée. Les journées avec du piano, Vocabulaire compris, restent regroupées par date pour l’heure classique habituelle.

Le tableau de bord distingue le piano, l’écoute intérieure et Vocabulaire hors piano dans les totaux, graphiques, historiques et exports. Les anciennes sauvegardes restent acceptées. L’arrivée de Vocabulaire ne décale pas la période commune historique des trois premiers parcours. La migration additive `supabase/migrations/20261121_add_vocabulaire.sql` élargit uniquement la liste des applications autorisées ; les règles RLS et la fonction de publication restent inchangées.

Vérification : tests du module, tests du calculateur réel et tests du runtime avec connexion simulée ; vérification de la publication RPC, du rejet des révisions anciennes et de l’isolation RLS dans une transaction annulée, sans données de démonstration persistantes.

## Chronomètres et classique — 21 novembre 2026

Blues, Jazz, Bases et Vocabulaire proposent un chronomètre facultatif. Pause et reprise sont conservées localement par application. « Utiliser la durée » remplace le champ de durée de la fiche ouverte ; il faut ensuite enregistrer la séance. Les valeurs sont arrondies à la minute, séparément pour les deux natures dans Vocabulaire. Après un report, « Nouveau chrono » démarre une mesure distincte. Le chronomètre continue écran verrouillé : utiliser Pause pour les interruptions.

Le classique conserve les 380 h historiques et les estimations des journées piano jusqu’au 21 novembre 2026 inclus. Dès le 22 novembre, il ne dépend plus des séances des autres parcours. Le formulaire quotidien remplace le total d’une date, y compris une ancienne estimation ; 0 minute annule cette estimation. Les journées de classique seul alimentent aussi les graphiques et le cumul. Les durées et le répertoire sont locaux au tableau de bord et inclus dans son archive JSON version 5 ; les anciennes archives restent compatibles. La synchronisation existante des cinq parcours reste inchangée.
