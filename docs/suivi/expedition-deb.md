# Expédition — un seul `.deb` autonome pour Linux

**Statut : livré.** `make paquet` produit `dist/tampon_<version>_amd64.deb` (~100 Mo),
validé sur Debian bookworm **et** Ubuntu 24.04 vierges (`make test-deb`).

## Pourquoi la voie « validée » ne marchait pas

La branche `explore/pagedjs-browser` avait conclu : binaire Bun + pagedjs-cli +
`Depends: chromium` dans le `.deb`. Deux pièges non documentés à l'époque :

1. **Sur Ubuntu, `chromium` n'existe plus en .deb depuis 19.10** — le paquet apt
   est un wrapper qui installe le snap. Le snap est strictement confiné :
   pas d'accès au `/tmp` système, permissions cassées en headless
   (`/tmp/snap-private-tmp/...`). `Depends: chromium` ne fonctionnait donc
   que sur Debian pur — la moitié du public visé.
2. **puppeteer (enrobé par pagedjs-cli) est fragile sous Bun** : bugs WebSocket
   (Bun 1.3.x), échecs de `bun build --compile` sur chromium-bidi. Impossible
   de l'embarquer proprement dans le binaire compilé.

## Les deux découvertes qui débloquent

### chrome-headless-shell

Build officiel *headless-only* de Chrome (infra **Chrome for Testing**, une
archive par version, URL stable). Sans X11, D-Bus ni interface graphique —
et surtout **sans le problème de sandbox qui a tué la piste Electron** :
ce mur (setuid impossible, AppArmor Ubuntu 24.04) concernait le Chromium
*graphique*. En headless avec `--no-sandbox` (déjà la pratique du pipeline
Docker, sur contenu local de confiance), il n'existe pas.

On l'embarque donc dans le `.deb` (~110 Mo décompressé) : zéro prérequis,
hors-ligne, rendu strictement identique sur toutes les distributions —
version épinglée dans `scripts/construire-deb-interne.sh`.

### Client CDP natif (exit puppeteer et pagedjs-cli)

`src/imprimante.ts` (~150 lignes) parle **Chrome DevTools Protocol** en
WebSocket (natif Bun), reproduisant exactement la logique de
[`pagedjs-cli/src/printer.js`](https://github.com/pagedjs/pagedjs-cli/blob/main/src/printer.js) :

1. spawn `chrome-headless-shell --headless --no-sandbox --remote-debugging-port=0`,
   lecture de l'endpoint `ws://` sur stderr ;
2. `Target.createTarget` sur la page d'impression servie par le serveur lui-même
   (`GET …/imprimer/<jeton>`, HTML gardé en mémoire) — le HTML embarque
   `paged.polyfill.js` et `window.PagedConfig.after` qui pose `window.__tamponRendu` ;
3. attente de ce drapeau via `Runtime.evaluate` (timeout 60 s,
   `TAMPON_DELAI_RENDU`) ;
4. `Page.printToPDF` avec les mêmes options que pagedjs-cli :
   `preferCSSPageSize: true`, marges 0, `printBackground: true`.

Plus transparent que puppeteer (conforme à la ligne du projet), zéro
`node_modules` au runtime, tout tient dans le binaire `bun build --compile`.

## Architecture livrée

```
tampon_0.3.0_amd64.deb (~100 Mo)
├── /usr/bin/tampon                         wrapper : exporte TAMPON_RACINE,
│                                           CHROMIUM_PATH, exec le binaire
├── /usr/lib/tampon/bin/tampon              serveur compilé (Bun + marked + CDP)
├── /usr/lib/tampon/chrome-headless-shell/  moteur de rendu épinglé
└── /usr/lib/tampon/share/{ui,gabarits,examples}

tampon → serveur HTTP (port libre dès 3000) → xdg-open du navigateur
tirages dans ~/Documents/Tampon · journal dans ~/.local/state/tampon
```

Les gabarits CSS sont servis en HTTP au Chromium embarqué (`@import` et
`@font-face` se résolvent en relatif) — fini le HTML dans `/tmp`.

Docker reste l'environnement dev/CI avec le **même pipeline CDP**
(`CHROMIUM_PATH=/usr/bin/chromium`, l'image est Debian : pas de piège snap).

## Pièges rencontrés en route

- **`Depends:` réels de chrome-headless-shell** : le `deb.deps` fourni dans
  l'archive est le gabarit générique de Chrome (GTK, wget…) — surdimensionné.
  La liste exacte vient de `ldd` sur bookworm vierge : nss, nspr, expat,
  fontconfig, glib, x11/xcb (liées à l'ELF même sans serveur X), asound,
  atk/atspi, dbus, gbm, xkbcommon.
- **Transition time64 d'Ubuntu 24.04** : `libasound2` y est un nom virtuel ;
  apt choisissait le mauvais fournisseur (`liboss4-salsa-asound2` →
  `undefined symbol: snd_device_name_get_hint`). Correction :
  `Depends: libasound2t64 | libasound2`.

## Validation

- `make test` — pipeline CDP dans Docker (UI, compositions rapport et AP,
  rejet vide) ; code de sortie réel, utilisé comme barrière CI.
- `make test-deb` — installation du `.deb` dans `debian:bookworm` et
  `ubuntu:24.04` vierges, composition `rapport.md` (2 pages) et `ap-test.md`
  (3 pages, fontes Jost/Inter embarquées vérifiées par `pdffonts`), rejet vide.
- `make essai-deb` — essai interactif : conteneur vierge, UI ouverte dans le
  navigateur hôte, tirages dans `./tirages/`.

## CI/CD (GitHub Actions)

Les workflows réutilisent l'infra locale telle quelle :

- **`ci.yml`** (push/PR) — `make test`, puis `make paquet` + `make test-deb`
  avec cache du zip chrome-headless-shell (clé dérivée du script de build :
  invalidée quand `CHS_VERSION` change) ; le `.deb` de chaque run est
  téléchargeable en artefact.
- **`release.yml`** (tag `v*`) — vérifie la cohérence tag ↔ `package.json`,
  reconstruit et revalide, puis publie la release GitHub : `.deb`,
  `SHA256SUMS`, attestation de provenance (supply chain), `--prerelease`
  automatique si le tag contient un tiret (`v0.3.0-alpha.1`).

Versionnage pré-release : `0.3.0-alpha.1` (npm/tag) devient `0.3.0~alpha.1`
côté Debian — le tilde trie avant `0.3.0`, apt proposera bien la mise à jour
vers la version finale.
