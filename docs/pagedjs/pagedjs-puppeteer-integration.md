# Paged.js + Puppeteer — Intégration (source : pagedjs-cli/src/printer.js)

> Ce document est basé sur le source officiel de pagedjs-cli :
> https://github.com/pagedjs/pagedjs-cli/blob/main/src/printer.js
> https://github.com/pagedjs/pagedjs/blob/main/src/polyfill/polyfill.js

## Pattern d'intégration (tiré du source réel)

pagedjs-cli procède ainsi :

1. Charge la page HTML dans puppeteer
2. Désactive l'auto-rendu (`window.PagedConfig.auto = false`)
3. Injecte son bundle browser (`dist/browser.js`) qui expose `window.PagedPolyfill`
4. Écoute l'événement `rendered` via `window.PagedPolyfill.on("rendered", ...)`
5. Déclenche `window.PagedPolyfill.preview()` manuellement
6. Attend la résolution d'une Promise + `waitForSelector(".pagedjs_pages")`
7. Appelle `page.pdf()` avec `preferCSSPageSize: true` et marges à 0

## Options page.pdf() correctes

```javascript
await page.pdf({
  path: outputPath,
  printBackground: true,
  displayHeaderFooter: false,
  preferCSSPageSize: true,   // Paged.js contrôle la taille via @page CSS
  margin: { top: 0, right: 0, bottom: 0, left: 0 },  // Paged.js gère les marges
});
```

⚠️ Ne pas mettre de marges dans puppeteer — Paged.js les gère entièrement via `@page { margin: ... }`.

## Événements Previewer (source : src/polyfill/previewer.js)

```javascript
// Événements émis par l'instance Previewer :
previewer.on("page", (page) => { ... });       // à chaque page rendue
previewer.on("rendering", (chunker) => { ... }); // début du rendu
previewer.on("rendered", (flow) => { ... });    // fin du rendu
previewer.on("size", (size) => { ... });        // taille de page définie
previewer.on("atpages", (pages) => { ... });    // règles @page traitées

// flow contient :
// flow.total       → nombre de pages
// flow.performance → temps de rendu en ms
// flow.size        → { width, height, format, orientation }
```

## API Polyfill (window.PagedPolyfill dans puppeteer)

```javascript
// Depuis puppeteer, après injection du bundle browser :
await page.evaluate(async () => {
  // window.PagedPolyfill = instance Previewer
  // window.Paged = { Previewer, Chunker, Polisher, Handler, ... }

  window.PagedPolyfill.on("rendered", (flow) => {
    window.onRendered(flow.total, flow.performance);
  });

  await window.PagedPolyfill.preview(); // déclenche le rendu
});
```

## window.PagedConfig — Configuration polyfill

Défini avant le chargement de paged.polyfill.js pour contrôler le comportement :

```javascript
window.PagedConfig = {
  auto: true,           // true = rendu automatique au chargement (défaut)
  before: async () => { /* hook avant rendu */ },
  after: async (flow) => { /* hook après rendu */ },
  content: undefined,   // HTMLElement ou sélecteur (défaut : <body>)
  stylesheets: [],      // URLs de CSS supplémentaires
  renderTo: undefined,  // où insérer le résultat (défaut : <body>)
  settings: {},         // options passées au Previewer
};
```

## Launch puppeteer pour Docker (source : printer.js + troubleshooting)

```typescript
import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH ?? '/usr/bin/chromium',
  headless: true,
  args: [
    '--no-sandbox',             // requis dans Docker
    '--disable-dev-shm-usage',  // évite les crashs mémoire (/dev/shm trop petit)
  ],
  ignoreHTTPSErrors: true,
});
```

## Accès aux fichiers locaux

Pour que puppeteer puisse charger les CSS et fontes locales depuis `file://` :

```typescript
// Option 1 : flag Chromium
args: ['--allow-file-access-from-files']

// Option 2 : servir les assets via un serveur HTTP local (plus propre)
// → servir gabarits/ sur localhost:PORT/gabarits/
// → le HTML référence http://localhost:PORT/gabarits/gabarit-rapport.css
```
