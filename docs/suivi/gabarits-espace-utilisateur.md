# Exposer les gabarits et exemples fournis dans `~/Documents/Tampon`

**Statut : premier jet.** Réf. issue #5.

## Problème

Sur le `.deb`, les gabarits et exemples fournis sont enfouis sous
`/usr/lib/tampon/share/{gabarits,examples}` — arborescence `root`, lecture
seule, invisible pour un utilisateur normal. On veut les lui exposer là où il
travaille déjà (`~/Documents/Tampon`, à côté des tirages) **et** qu'il puisse
les modifier.

## Décision retenue — option A (copie éditable)

Au démarrage du serveur (process utilisateur, jamais en `postinst` : le `.deb`
tourne en `root` et ignore le `$HOME` de chacun), les fichiers fournis sont
**semés éditables** dans `~/Documents/Tampon/{gabarits,examples}`, puis l'app
lit désormais les gabarits depuis là (`GABARITS_DIR`). Un simple *symlink* vers
`share/` (option B) aurait été en lecture seule — écarté.

- **Activation ciblée** : le wrapper `/usr/bin/tampon` pose
  `TAMPON_ESPACE_UTILISATEUR=1`. Hors `.deb` (dev, Docker) le drapeau est
  absent → aucun effet, les gabarits restent lus depuis le dépôt / l'image.
- **Amorçage idempotent** (`src/amorcage.ts`) : copie fichier à fichier via
  `cpSync(force:false, errorOnExist:false)`. Sémantique inter-versions voulue —
  un fichier ajouté par une mise à jour est semé, **une version éditée par
  l'utilisateur n'est jamais écrasée**. Les sous-dossiers existants (`fonts/`)
  sont parcourus pour y semer les nouveautés.
- Source de vérité unique : liste (`/gabarits`), validation de `/composer`,
  service HTTP et rendu (`renderer.ts`, via `<link>`) lisent tous
  `GABARITS_DIR` → l'édition prend effet immédiatement.

## Désinstallation — laisser + documenter

Les copies vivent dans le `$HOME` utilisateur et peuvent avoir été éditées : ce
sont des **données utilisateur**. `postrm` tourne en `root` et ne connaît pas
les homes ; un balayage `/home/*/Documents/Tampon` serait intrusif et risquerait
une perte de travail. La désinstallation **ne touche donc pas** à
`~/Documents/Tampon` — comportement documenté ici et vérifié par `make test-deb`
(qui contrôle par ailleurs que rien ne subsiste sous `/usr`).

## Population fournie — pour que l'utilisateur ne parte pas de zéro

Chaque dossier amorcé contient au moins un modèle fonctionnel à dupliquer :

- `gabarits/` : deux gabarits complets (`gabarit-rapport.css`, `gabarit-lettre.css`),
  les partiels partagés (`caracteres.css` = réglages, `habillage.css`), et un
  guide `LISEZ-MOI.md` qui énonce la règle porteuse (`gabarit-<nom>.css` →
  entrée du menu) et la marche à suivre.
- `gabarits/fonts/` : la famille Atkinson Hyperlegible (4 `.ttf`).
- `examples/` : un Markdown d'exemple **par gabarit** (`rapport.md`, `lettre.md`).

Le serveur auto-découvre tout `gabarit-*.css` : créer un modèle = copier un
gabarit existant, le renommer, l'éditer — il réapparaît au tirage suivant.

*À noter (hors périmètre) : le renderer insère le corps sans conteneur
`.corps-document`, donc les sélecteurs `.corps-document > p:first-child/last-child`
du gabarit lettre restent inertes — à traiter avec le wiki #6 / le design.*

## Couverture de test (`scripts/tester-deb-interne.sh`)

- gabarits + exemples + guide fournis exposés dans `~/Documents/Tampon` (fonte
  incluse) ;
- copies éditables (droits utilisateur) ;
- composition réelle **depuis les exemples exposés** (userspace) avec les
  gabarits userspace → PDF (`rapport` **et** `lettre`) ;
- amorçage idempotent : une édition survit à un relancement à froid ;
- désinstallation : `/usr` propre **et** `~/Documents/Tampon` préservé intact.
