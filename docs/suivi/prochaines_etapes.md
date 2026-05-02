# Prochaines étapes — vers un binaire distribuable

## Constat actuel

L'architecture Docker actuelle est solide pour un usage serveur, mais ne permet pas de distribuer une application standalone. La contrainte principale : **Paged.js nécessite un moteur browser** (Chromium headless via pagedjs-cli). Bundler Chromium dans un binaire est techniquement possible mais lourd (~150Mo) et fragile selon les distributions.

## Objectif

Une application desktop distribuable (`.deb`, `.AppImage`, `.dmg`) avec interface graphique, sans prérequis système pour l'utilisateur.

## Chemin recommandé : Electron

Electron embarque Chromium nativement. C'est le véhicule standard pour ce cas d'usage.

**Avantages dans notre contexte :**
- Paged.js tourne directement dans la fenêtre Electron — plus besoin de pagedjs-cli subprocess
- `renderer.ts` (fonction pure `(markdown, gabarit, meta) → HTML`) branche sans modification
- Interface graphique dans la même stack (HTML/CSS/JS)
- Distribution via `electron-builder` : `.deb`, `.AppImage` (Linux), `.dmg` (Mac), `.exe` (Windows)

**Architecture cible :**

```
Main process (Node/Bun)          Renderer process (Chromium)
─────────────────────────        ──────────────────────────────
renderer.ts (MD → HTML)    →     Paged.js (pagination CSS)
composer-electron.ts       ←     window.PagedPolyfill.preview()
  └─ page.pdf() via IPC          Interface utilisateur
```

**Ce qui change :**
- `composer.ts` : remplacer l'appel subprocess `pagedjs-cli` par IPC Electron + `page.pdf()`
- `server.ts` : remplacé par le main process Electron
- Docker : optionnel (mode serveur conservé pour usage CI/API)

**Ce qui ne change pas :**
- `renderer.ts` — aucune modification
- `gabarits/` CSS — aucune modification
- `gabarits/fonts/` — aucune modification

## Étapes

1. Prototype Electron minimal — charger `rendrePage()` dans une `BrowserWindow`, vérifier le rendu Paged.js
2. Export PDF via `contents.printToPDF()` (API Electron native, pas besoin de puppeteer)
3. Interface utilisateur (éditeur Markdown + sélecteur de gabarit + bouton Composer)
4. Packaging avec `electron-builder`

## Référence

- [Electron — printToPDF](https://www.electronjs.org/docs/latest/api/web-contents#contentsprinttopdfoptionsoptions)
- [electron-builder](https://www.electron.build/)
