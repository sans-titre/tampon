# Paged.js — Vue d'ensemble

> Source : https://github.com/pagedjs/pagedjs / https://pagedjs.org

Paged.js est une bibliothèque open-source qui implémente les spécifications W3C **CSS Paged Media** et **Generated Content** dans les navigateurs. Elle permet de produire des documents paginés (livres, rapports, lettres) depuis du HTML/CSS standard.

## Composants principaux

| Composant | Rôle |
|---|---|
| **Polyfill** (`paged.polyfill.js`) | Script à inclure dans le HTML — transforme automatiquement la page selon les règles `@page` |
| **Chunker** | Fragmente le document en pages (flows paginés) |
| **Polisher** | Convertit les déclarations `@page` CSS en classes gérables |
| **Previewer** | API programmatique pour usage en Node.js |
| **Handler** | Classe de base pour extensions custom |

## Deux modes d'utilisation

### 1. Polyfill navigateur (preview)

Inclure `paged.polyfill.js` dans le HTML :
```html
<script src="paged.polyfill.js"></script>
```
Paged.js s'exécute automatiquement au chargement et applique la pagination. L'utilisateur voit le document paginé dans le navigateur, identique au PDF final.

### 2. Programmatique (génération PDF via puppeteer)

Charger la page dans puppeteer → Paged.js s'exécute → `page.pdf()` capture le résultat.

```typescript
import { Previewer } from 'pagedjs';

const paged = new Previewer();
const flow = await paged.preview(
  htmlContent,
  ['path/to/stylesheet.css'],
  document.body
);
console.log(`Rendu : ${flow.total} pages`);
```

## Événement de fin de rendu

Paged.js émet un événement quand le rendu est terminé. À attendre dans puppeteer avant d'appeler `page.pdf()` :

```javascript
// Dans puppeteer, attendre la fin du rendu Paged.js
await page.waitForFunction('window.PagedPolyfill !== undefined');
await page.waitForFunction('window.PagedPolyfill.done === true', { timeout: 30000 });
```

## Système d'extensions (Handlers)

```javascript
import { Handler } from 'pagedjs';

class MonHandler extends Handler {
  constructor(chunker, polisher, caller) {
    super(chunker, polisher, caller);
  }
  // hooks disponibles : beforeParsed, afterParsed, beforePageLayout, afterPageLayout, etc.
}
```

## Licence

MIT — usage libre commercial et non-commercial.
