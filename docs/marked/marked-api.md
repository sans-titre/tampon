# marked — API & Configuration

> Source : https://marked.js.org / https://marked.js.org/using_advanced / https://marked.js.org/using_pro

marked est un compilateur Markdown rapide, conforme CommonMark (98%) et GitHub Flavored Markdown (97%).

## Installation

```bash
bun add marked
```

## Usage de base

```typescript
import { marked } from 'marked';

const html = marked.parse('# Titre\n\nContenu **gras**.');
// → '<h1>Titre</h1>\n<p>Contenu <strong>gras</strong>.</p>\n'
```

## Instance isolée (recommandé)

Évite les mutations globales si plusieurs instances coexistent :

```typescript
import { Marked } from 'marked';

const marked = new Marked({ gfm: true, breaks: false });
const html = marked.parse(markdownString);
```

## Options de configuration

| Option | Type | Défaut | Description |
|---|---|---|---|
| `gfm` | boolean | `true` | GitHub Flavored Markdown |
| `breaks` | boolean | `false` | `\n` → `<br>` (style GFM) |
| `async` | boolean | `false` | Active `walkTokens` async |
| `silent` | boolean | `false` | Supprime les exceptions |
| `renderer` | object | `Renderer()` | Personnalise le HTML produit |
| `tokenizer` | object | `Tokenizer()` | Personnalise la tokenisation |
| `walkTokens` | function | `null` | Post-traitement sur chaque token |

## Parsing inline (sans balise de bloc)

```typescript
import { marked } from 'marked';

const html = marked.parseInline('**gras** et _italique_');
// → '<strong>gras</strong> et <em>italique</em>'
```

## Renderer custom

Surcharger la génération HTML pour certains tokens :

```typescript
marked.use({
  renderer: {
    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens);
      return `<h${depth} class="titre-${depth}">${text}</h${depth}>\n`;
    },
    paragraph({ tokens }) {
      const text = this.parser.parseInline(tokens);
      return `<p class="corps">${text}</p>\n`;
    }
  }
});
```

## Sécurité

⚠️ marked ne sanitize PAS le HTML produit. Pour contenu utilisateur non maîtrisé, utiliser DOMPurify ou équivalent.
Dans Tampon, le Markdown vient de l'utilisateur via formulaire — l'output est rendu dans un contexte contrôlé (PDF local), le risque XSS est négligeable.

## Extensions disponibles (npm)

- `marked-custom-heading-id` — IDs custom sur les titres
- `marked-footnote` — notes de bas de page
- `marked-katex` — formules mathématiques
- `marked-shiki` — coloration syntaxique
