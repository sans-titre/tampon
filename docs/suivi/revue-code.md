# Revue de code — branche `feat/expedition-deb` (avant release stable)

Revue multi-angles (lecture ligne à ligne, audit des comportements supprimés,
traçage inter-fichiers, réutilisation, simplification, efficacité, altitude),
chaque constat contre-vérifié sur le code. Périmètre : tout le diff vs `main`
(~1 350 lignes). État : alpha fonctionnelle et testée — les constats ci-dessous
sont ce qui sépare l'alpha d'une release stable sereine.

## Verdict global

L'architecture est saine : pipeline transparent, modules courts à
responsabilité unique (`renderer` pur, `composer` orchestration, `imprimante`
transport CDP, `config` chemins), contrat CSS Paged Media intact, infra de
test réutilisée à l'identique par le CI. Les défauts sérieux se concentrent
en un seul endroit : **la robustesse du client CDP face aux pannes**
(3 chemins de blocage infini) et **les entrées non maîtrisées** (validation,
collisions de noms). Rien de structurel — tout se corrige sans toucher
l'architecture.

## P1 — à corriger avant la release stable

### 1. Trois chemins de blocage infini dans le pipeline d'impression

Le remplacement de pagedjs-cli (qui, en subprocess, finissait *toujours* par
sortir avec un code) a perdu une garantie : « toute composition se termine ».

- **`imprimante.ts:61`** — `DELAI_DEMARRAGE` n'est vérifié qu'entre deux
  lectures de stderr ; `await lecteur.read()` peut bloquer sans fin si
  Chromium démarre mais n'annonce jamais son endpoint (snap shim, profil
  verrouillé). Le `finally` (kill) n'est jamais atteint.
- **`imprimante.ts:21`** — `SessionCDP` n'a pas de gestionnaire
  `close`/`error` : si Chromium crashe en plein job (OOM sur un gros
  document), les promesses en attente dans `attentes` ne se règlent jamais.
- **`imprimante.ts:12`** — `TAMPON_DELAI_RENDU` non numérique → `NaN` →
  `Date.now() > NaN` toujours faux → la boucle d'attente ne expire jamais.

Conséquence commune : POST /composer suspendu pour toujours, jeton qui fuit
dans `pagesEnAttente`, processus Chromium orphelin, UI bloquée sur
« Composition en cours… ».

**Correctif** : un seul mécanisme au bon niveau — envelopper `imprimer()`
dans un `Promise.race` avec une échéance globale (et valider l'env avec
`Number.isFinite`), rejeter toutes les `attentes` sur l'évènement `close` du
WebSocket, et `kill` dans le `finally` quoi qu'il arrive. La garantie
« toute composition se termine » redevient structurelle.

### 2. `server.ts:69` — 500 au lieu de 400 sur `gabarit` manquant

`gabarit.includes("/")` lance un TypeError si `gabarit` est absent ou non
chaîne (l'ancienne liste blanche `["rapport","lettre"].includes(...)`
tolérait `undefined`). L'exception sort de `traiter()` sans passer par le
journal. Même fragilité : `await req.json()` sur un corps malformé.

**Correctif** : `typeof gabarit !== "string"` en tête de validation, et un
try/catch englobant dans `traiter` qui journalise et renvoie un JSON
d'erreur propre.

### 3. `server.ts:95` — le serveur écoute sur `0.0.0.0`

Défaut de `Bun.serve`. Acceptable en Docker (le mapping de port l'exige),
**pas pour le `.deb` desktop** : tout le réseau local peut lire
`~/Documents/Tampon` via `/tirages/` (slugs devinables) et déclencher des
compositions. Le flux d'impression n'a besoin que de la boucle locale.

**Correctif** : `hostname: "127.0.0.1"` par défaut, surchargé par
`TAMPON_HOTE=0.0.0.0` posé dans le Dockerfile.

### 4. `composer.ts:42` — collisions de noms de tirages

Le nom dérive du seul titre slugifié : deux compositions (concurrentes ou
successives) au même titre s'écrasent silencieusement — livraison croisée
possible (l'utilisateur A reçoit le PDF de B). Cas aggravant
(`composer.ts:28`) : un titre entièrement non latin (cyrillique, CJK) se
slugifie en chaîne vide → fichier caché `.pdf`, écrasé à chaque fois.

**Correctif** : suffixe d'unicité en cas de collision (`rapport-2.pdf`) ou
horodatage court ; replier sur `tirage-<timestamp>` quand le slug est vide.

## P2 — recommandé avant diffusion large

5. **`imprimante.ts:112` — échecs de rendu aveugles.** Aucune écoute de
   `Runtime.exceptionThrown` : une erreur Paged.js en page (gabarit CSS
   malformé — d'autant que la validation est désormais « tout
   `gabarit-*.css` présent ») ne remonte qu'en « timeout 60 s » générique.
   pagedjs-cli, lui, remontait l'erreur immédiatement. Correctif : activer
   `Runtime.enable` et journaliser `exceptionThrown`/console — le
   gestionnaire de messages reçoit déjà ces évènements et les jette.
6. **`renderer.ts:16` — méta non échappées** dans `<title>` et les bandeaux
   (`<`, `&`, `</style>` corrompent la page d'impression ; préexistant à la
   branche mais le correctif tient en une fonction `echapper()` de 3 lignes).
7. **`imprimante.ts:87` — pas de `--user-data-dir`** : deux Chromium
   concurrents peuvent se disputer le profil par défaut (SingletonLock) ; le
   second échoue avec l'erreur opaque « endpoint DevTools ». Correctif :
   `--user-data-dir` jetable par job (et le supprimer au `finally`).
8. **`imprimante.ts:115` — la boucle `Runtime.evaluate` peut tomber pendant
   la navigation initiale** (« Execution context was destroyed ») et fait
   échouer le job au lieu de réessayer au tick suivant. Correctif : try/catch
   sur l'évaluation dans la boucle — ou mieux, voir le point 12.
9. **Métadonnées PDF perdues** : pagedjs-cli post-traitait le PDF (titre,
   sommaire depuis les `<h*>`). `Page.printToPDF` brut n'en met aucune — les
   tirages apparaissent « sans titre » dans les lecteurs. Correctif minimal :
   `generateDocumentOutline: true` dans `printToPDF` ; titre via le `<title>`
   déjà présent.

## P3 — qualité, dette, élégance

10. **Triple duplication des assertions de test** : `tester-serveur.sh`,
    `tester-deb-interne.sh` et la cible `debug` du Makefile portent chacun
    leur copie du payload jq, de la boucle d'attente (30×1 s / 30×0,5 s /
    `sleep 4`) et du helper `composer()`. Un `scripts/lib-test.sh` sourcé
    (fonctions `attendre_url`, `composer`) supprime la dérive — le contrat
    `/composer` ne doit vivre qu'à un endroit. (`debug` garde en plus un
    `sleep 4` aveugle et l'URL en dur.)
11. **`server.ts:99` — `throw` mort** dans `demarrer()` (« Aucun port
    disponible » est inatteignable : la dernière itération relance toujours)
    et le `catch` avale aussi les erreurs non-EADDRINUSE en les attribuant au
    mauvais port. Garder la dernière erreur et la relancer après la boucle.
12. **`imprimante.ts:115` — sondage 100 ms** là où CDP a un évènement exact :
    `Runtime.addBinding` + `bindingCalled` (le `PagedConfig.after` appellerait
    la liaison au lieu de poser un drapeau). Supprime la latence morte, les
    ~600 allers-retours d'un document lent, et le point 8 par construction.
13. **`imprimante.ts:67` — tampon stderr non borné**, mutifié par une tâche
    de fond que personne n'attend, pour n'en garder que 500 caractères.
    Borner dans la boucle de drainage (`(tampon + chunk).slice(-500)`).
14. **Un Chromium froid par job** (~1-2 s) : structure déjà prête pour un
    processus chaud unique + un target par job (`Target.createTarget` est
    déjà là) — décisif pour le « mode lot » de la feuille de route ; à
    défaut, documenter le compromis.
15. **`config.ts:13` — boutons morts** : `UI_DIR`/`GABARITS_DIR` ne sont
    posés nulle part ; `TAMPON_RACINE` suffit dans les trois contextes.
    Réduire la surface de configuration à ce qui est réellement servi.
16. **Altitude — nom du `.deb`** : mettre le tiret dans le *nom de fichier*
    dès `construire-deb-interne.sh` (le tilde n'est requis que dans le champ
    `Version:` du control) et l'étape « Nom d'artefact sans tilde » de
    `release.yml` disparaît ; l'artefact CI et l'asset de release portent
    enfin le même nom.
17. **Altitude — `CHS_VERSION`** : épinglage enfoui dans le script et clé de
    cache CI = hash du script entier (toute retouche cosmétique → 100 Mo
    retéléchargés). Hisser la version en variable Makefile/env unique et
    dériver la clé de cache de la valeur.
18. **Altitude — gabarits, trois points d'édition** : ajouter un gabarit
    demande le CSS *et* une `<option>` dans `ui/index.html` (la validation,
    elle, suit le système de fichiers). Une route `GET /gabarits` (readdir)
    alimentant le `<select>` ramène à une seule source de vérité — et
    remplace le garde `includes("/")` par une vraie liste blanche.
19. Mineurs : `essai-deb` absent du `.PHONY` ; `apt-get install` à chaque
    `make paquet` (une image de build dédiée à 4 lignes le met en cache) ;
    commentaire de `pagesEnAttente` (« servies une seule fois ») inexact —
    purge au `finally`, pas à la lecture.

## Ce qui est bon (à préserver)

- **Modules courts, responsabilité unique, zéro dépendance runtime** hors
  `marked` — le binaire compilé reste honnête.
- **`SessionCDP` minimal** (60 lignes) : exactement le sous-ensemble CDP
  nécessaire, lisible par un humain, trivialement remplaçable.
- **L'infra de test est le CI** : `make test`/`make test-deb` identiques en
  local et dans Actions — pas de double maintenance.
- **Chaîne de release** : garde-fou tag↔version, revalidation sur
  distributions vierges avant publication, checksums + attestation.
- **Documentation des décisions** (autopsies, pièges snap/time64) — rare et
  précieux pour un repreneur.

## Ordre suggéré

1. P1.1 (robustesse `imprimante.ts`) + P1.2 — un commit, testable en
   coupant un Chromium en plein job.
2. P1.3 + P1.4 — petits, isolés.
3. P2.5 + P2.8 via P3.12 (passage aux évènements CDP) — un commit.
4. P3.10 (lib de test partagée), puis le reste au fil de l'eau.
5. Re-taguer `v0.3.0-alpha.2` et faire tourner la release.
