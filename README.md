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

Le pipeline délègue autant que possible à [Vivliostyle CLI](https://vivliostyle.org/) :

- **VFM** (Vivliostyle Flavored Markdown) convertit le `.md` en HTML
- **CSS Paged Media** (`@page`, `position: running(...)`) gère la pagination et les éléments courants
- **Chromium headless** imprime le résultat en PDF

`composer.ts` se limite à préfixer les running elements comme HTML brut dans le `.md`, pointer Vivliostyle vers le bon gabarit CSS, et récupérer le PDF produit.

## Prérequis

Docker Desktop installé. C'est tout.
