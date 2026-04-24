# Prochaines étapes

> **Ordre d'exécution :** bundler vivliostyle sans prérequis (v0.3, voir `explore-bun-launcher.md`) → refactoring themes ci-dessous → cross-platform (Mac/Win)


## Refactoring — déléguer à Vivliostyle

### Contexte

Notre `composer.ts` réimplémente des fonctionnalités que Vivliostyle CLI gère nativement. On peut simplifier significativement le pipeline.

### Ce qu'on peut supprimer

| Ce qu'on a écrit | Ce que Vivliostyle fait nativement |
|---|---|
| `marked` + parsing markdown | Vivliostyle lit les `.md` directement |
| `parseFrontmatter()` | Vivliostyle lit le YAML frontmatter |
| `genererHTML()` | Remplacé par un template HTML de theme |

### Ce qui reste légitime

Les **running elements** (bandeau haut, pied de page) nécessitent des éléments HTML dans le document avec les classes CSS `position: running(...)`. Vivliostyle ne les injecte pas depuis le frontmatter seul — il faut un **template HTML layout** qui :

1. Déclare les éléments courants avec les bonnes classes
2. Reçoit les métadonnées (titre, date, auteur) comme variables
3. Inclut le contenu Markdown converti

C'est exactement ce que le système de **themes Vivliostyle** permet.

### Plan d'action

1. **Lire la doc `vivliostyle-themes-and-css.md`** et comprendre comment un theme définit un template HTML layout

2. **Créer un theme par gabarit** :
   - `gabarits/rapport/` — `package.json` + `layout.html` + CSS
   - `gabarits/lettre/` — idem

3. **Passer le theme à Vivliostyle** via `vivliostyle.config.js` généré dynamiquement ou via `--theme`

4. **Simplifier `composer.ts`** :
   - Supprimer `marked`, `parseFrontmatter`, `genererHTML`
   - Écrire le `.md` brut (frontmatter inclus) dans le temp dir
   - Laisser Vivliostyle tout faire

5. **Supprimer la dépendance `marked`** du `package.json`

### Résultat attendu

`composer.ts` réduit à : écrire le fichier, appeler Vivliostyle, retourner le nom du PDF.
