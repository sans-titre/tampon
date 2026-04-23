# Générateur PDF sans-titre

Stack : Vivliostyle CLI + Bun + webapp locale (HTML/CSS/JS vanilla)  
Principe : Markdown → PDF de qualité typographique via Chromium

---

## Brief technique — pour le dev

### Contexte
Générateur de documents PDF de qualité typographique pour l'association sans-titre. Contenu rédigé en Markdown, rendu via Vivliostyle CLI + Chromium. Interface utilisateur : webapp locale (serveur Bun, UI dans le navigateur).

### Stack
- **Vivliostyle CLI** — rendu PDF
- **Bun** — serveur local + compilation en binaire standalone
- **HTML/CSS/JS vanilla** — UI locale (pas de framework)

### Architecture CSS — priorité absolue
Trois couches strictement séparées :

```
tokens.css       ← typographie, couleurs, espacements (identité sans-titre)
components.css   ← en-tête, footer, éléments réutilisables
layout-XXX.css   ← mise en page par type de document
```

Un nouveau template = un nouveau `layout-XXX.css` qui importe les deux premiers. Les tokens ne changent jamais sauf évolution de l'identité graphique.

### Templates à livrer (V1)
- `layout-rapport.css` — rapport d'activité A4
- `layout-lettre.css` — courrier A4 (mêmes styles de caractères, mise en page différente)

Chaque template inclut : en-tête fixe avec logo sans-titre, footer avec coordonnées/SIRET, numérotation des pages, hiérarchie typographique H1/H2/H3/body/caption.

### Webapp locale
- Bun lance un serveur sur `localhost:3000` au démarrage
- UI : zone de texte Markdown + sélecteur de template + bouton "Générer PDF"
- Le PDF est écrit dans un dossier `output/` local
- Chromium système utilisé (pas bundlé) — prérequis documenté

### Distribution
Trois binaires compilés avec Bun : Mac arm64, Mac x64, Windows. Linux si besoin. Distribués via GitHub Releases. Double-clic → le serveur démarre → le navigateur s'ouvre automatiquement sur `localhost:3000`.

### Hors scope V1
Slides, authentification, stockage cloud, éditeur riche, prévisualisation live.

---

## Brief exploitation — pour l'utilisation quotidienne

### Installation (une fois)
1. Télécharger le binaire correspondant à ton OS sur GitHub
2. Dézipper, placer le dossier où tu veux
3. Double-clic sur `sans-titre-docs`
4. Le navigateur s'ouvre automatiquement

Prérequis : avoir Chrome ou Chromium installé.

### Utilisation quotidienne

```
1. Double-clic sur l'appli
2. Sélectionner le type de document (rapport / lettre)
3. Écrire ou coller ton contenu Markdown dans la zone de texte
4. Cliquer "Générer"
5. Le PDF apparaît dans le dossier output/
```

### Markdown minimal à maîtriser

```markdown
# Titre principal
## Sous-titre
### Section

Paragraphe normal.

- item liste
- item liste

**gras**  _italique_
```

### Données structurées (tableaux)

```markdown
| Prestation | Quantité | Montant |
|------------|----------|---------|
| Concert    | 1        | 800 €   |
| **Total**  |          | **800 €** |
```

### Métadonnées du document (en-tête automatique)

```markdown
---
template: rapport
titre: Rapport d'activité — Saison 2025-2026
date: Avril 2026
auteur: Prénom Nom
---
```

Ces champs remplissent l'en-tête automatiquement. La mise en page n'est jamais à toucher.

### Évolution future possible
Si d'autres personnes de sans-titre doivent l'utiliser sans CLI ni Markdown : l'interface web peut être hébergée en ligne. Même workflow, zéro installation de leur côté.
