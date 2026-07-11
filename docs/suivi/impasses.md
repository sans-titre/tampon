# Impasses — explorations de distribution abandonnées

Avant d'aboutir au `.deb` autonome (binaire Bun + `chrome-headless-shell` embarqué piloté en **CDP natif** — voir [expedition-deb.md](expedition-deb.md)), plusieurs pistes de distribution ont été explorées puis écartées. Ce document en conserve l'essentiel ; les branches `explore/*` correspondantes ont été supprimées après récolte (diagrammes `.mmd` conservés dans `docs/diagrammes/`).

Fil conducteur : **le vrai problème n'a jamais été le rendu, mais l'embarquement de Chromium** (sandbox, snap, permissions) pour un outil dont la seule sortie est un PDF.

## 1. Electron desktop (`explore/electron-desktop`)

**Idée** : application desktop bundlée, double-clic, fenêtre native ; le Chromium d'Electron réutilisé pour Vivliostyle (une seule copie de Chromium pour les deux usages).

**Mur** : sandbox Chromium sur Ubuntu 24.04, trois couches imbriquées —
1. `chrome-sandbox` doit être `setuid root`, impossible dans une AppImage montée en lecture seule ;
2. fallback user-namespaces bloqué par AppArmor (`kernel.apparmor_restrict_unprivileged_userns=1`, introduit en 23.10) ;
3. un `.deb` avec post-install réglant les permissions (méthode VS Code/Slack/Discord) a été préparé mais non testé.

**Verdict** : suspendue. 330 Mo de bundle pour une UI qui reste dans un onglet, sandbox fragile à chaque évolution kernel/AppArmor, et la fenêtre native est secondaire pour cet outil. Apprentissages réutilisés ensuite (variables d'env, chemins découplés, Vivliostyle lancé via Bun et non le Node système). Diagramme : `docs/diagrammes/architecture-electron.mmd`.

## 2. Bun launcher + navigateur système (`explore/bun-launcher`)

**Idée** : un binaire unique (`bun build --compile`) ; au lancement, le serveur démarre et ouvre l'UI dans le navigateur système (modèle **Ollama**). Chromium **système** pour Vivliostyle. ~97 Mo, aucune fenêtre native.

**Insight clé** : Tampon n'a pas besoin d'une fenêtre native — ce qu'il produit c'est un PDF, le navigateur système suffit pour la saisie.

**Limite** : imposait toujours des **prérequis utilisateur** (Vivliostyle CLI + Chromium/Chrome). L'étape suivante — bundler Vivliostyle en binaire pour supprimer le prérequis — n'a jamais abouti (inconnue de taille, 100-200 Mo estimés).

**Verdict** : bonne direction (le duo service local + navigateur système a survécu jusqu'à la version finale), mais Vivliostyle et le Chromium système restaient à éliminer. Diagramme : `docs/diagrammes/architecture-bun-launcher.mmd`.

## 3. Paged.js + Tauri (`explore/pagedjs-tauri`)

**Idée** : remplacer Vivliostyle par **Paged.js** (implémentation JS pure des specs CSS Paged Media du W3C — mêmes `@page`, `position: running(...)`, `counter(page)`, donc **nos CSS inchangés**) dans une **WebView système** via Tauri. Bundle < 10 Mo, aucun Chromium embarqué.

**Inconnues bloquantes** : fidélité du print-to-PDF via WebView système (WebKitGTK / WebView2 / WebKit) non validée ; conversion Markdown à rebrancher ; complexité Rust/Tauri + sidecar.

**Verdict** : élégant sur le papier (« state of the art »), mais le rendu PDF via WebView système est trop incertain pour un outil dont la fidélité typographique est la raison d'être. Idée-clé retenue : **Paged.js**. Diagramme : `docs/diagrammes/architecture-pagedjs-tauri.mmd`.

## 4. pagedjs-cli + Chromium système (`explore/pagedjs-browser`)

**Idée** : `pagedjs-cli` en subprocess avec **Chromium système** déclaré `Depends: chromium` dans le `.deb`. Prototype **validant Paged.js + gabarits CSS + fonte Atkinson** (`test-pagedjs.html`). node_modules ~5 Mo (fini les ~200 Mo de Vivliostyle).

**Mur** : `Depends: chromium` est un piège — sur Ubuntu, `chromium` est un **snap confiné**, inutilisable en headless par un service. (Autopsie détaillée dans [expedition-deb.md](expedition-deb.md).)

**Verdict** : a fait converger le rendu vers Paged.js, mais l'approche « Chromium système » était l'impasse finale. Solution retenue : **`chrome-headless-shell` embarqué + CDP natif**, sans Chromium système ni prérequis. Diagramme : `docs/diagrammes/architecture-pagedjs-browser.mmd`.

## Ce qu'on a gardé de tout ça

- **Service local + navigateur système** (de bun-launcher), plutôt qu'une fenêtre native.
- **Paged.js** comme moteur de pagination (de pagedjs-tauri / pagedjs-browser).
- **Binaire Bun compilé** + assets embarqués (de bun-launcher).
- Mais **Chromium embarqué** (`chrome-headless-shell`) piloté en **CDP natif** — ni Vivliostyle, ni Chromium système, ni prérequis. Voir [expedition-deb.md](expedition-deb.md).
