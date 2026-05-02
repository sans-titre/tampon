# sans-titre — atelier de composition

Générateur de PDFs typographiques à partir de Markdown. On colle du texte, on choisit un gabarit, on récupère un PDF prêt à imprimer.

## Lancer l'atelier

```bash
docker compose up --build   # première fois
docker compose up           # ensuite
```

Ouvrir [http://localhost:3000/sans-titre.art/tampon](http://localhost:3000/sans-titre.art/tampon).

## Utilisation

1. Coller le contenu Markdown dans la zone de texte
2. Renseigner les métadonnées (titre, date, auteur) et choisir un gabarit
3. Cliquer **Composer →**
4. Le PDF s'ouvre dans le navigateur et est enregistré dans `tirages/`

## Frontmatter

Les métadonnées peuvent aussi être déclarées directement dans le Markdown :

```markdown
---
gabarit: rapport
titre: Rapport d'activité — Saison 2025-2026
date: Avril 2026
auteur: Prénom Nom
---

Le contenu du document commence ici...
```

| Champ | Rôle |
|---|---|
| `gabarit` | `rapport` ou `lettre` |
| `titre` | Affiché dans le bandeau haut et le nom du PDF |
| `date` | Affiché dans le bandeau haut |
| `auteur` | Affiché dans le pied de page |

## Gabarits

**Rapport** — document multi-pages avec bandeau haut (nom, titre courant, date), pied de page (coordonnées, numérotation), hiérarchie H1/H2/H3.

**Lettre** — format épistolaire : premier paragraphe aligné à droite (lieu et date), dernier paragraphe aligné à gauche (formule de politesse).

## Architecture

![Architecture](docs/rendus/architecture.png)

Le pipeline délègue autant que possible à [Paged.js](https://pagedjs.org/) via `pagedjs-cli` :

- **`renderer.ts`** convertit le Markdown en HTML via `marked` et injecte les running elements (bandeau, pied de page)
- **CSS Paged Media** (`@page`, `position: running(...)`) gère la pagination et les éléments courants
- **`pagedjs-cli`** pagine le HTML dans Chromium headless et exporte le PDF

`composer.ts` orchestre : écrit le HTML dans `/tmp`, appelle `pagedjs-cli` en subprocess, retourne le nom du PDF produit.

## Prérequis

Docker Desktop installé. C'est tout.
