# Spécimen — gabarit AP

## Section un

La typographie d'écran et la typographie d'impression partagent une logique commune : hiérarchiser l'information, guider le regard, ménager le silence. Ce qui change, c'est le support.

Le site construit sa grille sur un ratio précis, des marges calculées et un système de filets dynamiques. On traduit ici ce geste en unités physiques : millimètres, points typographiques, ratios fixes pour l'impression A4.

La mesure canonique est le module M = 5 mm. Les marges latérales valent 6M, la marge haute 7M, la marge basse 5M. Le galop — zone imprimable — fait donc 150 mm de large, divisé en deux colonnes de 70 mm séparées par une gouttière de 10 mm.

### Échelle typographique

L'échelle est construite sur la raison 1,25 (Major Third). Elle produit cinq valeurs : 9 pt pour le corps, 11 pt pour le chapô, 14 pt pour les H2, 18 pt pour les sous-titres de premier niveau, et 34 pt pour le H1. Ces valeurs sont fixes — elles n'utilisent pas de calculs relatifs.

> Le minimalisme n'est pas l'absence — c'est la pression maximale exercée sur ce qui reste.

## Section deux

### Bloc typographique

Un paragraphe court pour tester le H3 comme label de catégorie. Sa taille est identique au corps, mais son espacement et sa transformation le distinguent immédiatement.

Texte en **gras** composé en Jost Book 400, et texte en *italique* composé en InterTight Light Italic. Ces deux variantes servent à marquer l'emphase sans rompre la couleur typographique générale du bloc.

Le corps courant est composé en Inter Light 300 à 9 pt sur 1,6 de leading, soit environ 14,4 pt d'interlignage. Cela correspond à un retour toutes les 2,88 modules M — soit environ 14,4 mm — ce qui reste cohérent avec la grille horizontale.

### Filets et séparateurs

Les filets horizontaux jouent un rôle structural. Le filet de tête — 0,4 mm — sépare la zone de texte des bandeaux courants. Le filet de pied — 0,1 mm — délimite la pagination. Un séparateur de contenu à 0,1 mm et 30 % d'opacité peut être inséré dans le corps pour marquer une rupture thématique sans rupture visuelle forte.

---

Les filets fins sont en `--filet-fin: 0.1mm`, les filets structurants en `--filet: 0.4mm`. L'encre est définie à `#0a0a0a` plutôt que noir pur pour éviter le contraste excessif sur blanc.

## Section trois

### Listes

Les listes non ordonnées utilisent le tiret long comme marqueur, composé en Jost Hairline 100 pour contraster avec le corps Inter.

- Premier élément de liste simple
- Deuxième élément, plus long pour observer le retour à la ligne et l'alignement du texte avec le début du premier mot, pas avec le marqueur
- Troisième élément court
- Quatrième élément pour compléter le bloc

Liste ordonnée :

1. Définir la grille de base en millimètres
2. Convertir les ratios en valeurs fixes
3. Tester à l'impression réelle sur papier
4. Ajuster les compensations optiques si nécessaire

## Section quatre — page deux

Cette section doit apparaître sur la deuxième page et permettre de vérifier que la grille de contrôle (baseline et colonnes) se répète correctement, et que le bandeau courant et la pagination fonctionnent.

### Continuité de la grille

La grille de baseline à 5 mm doit être continue entre les pages. Le bandeau `@top-left` doit afficher le titre du document, `@top-right` la date, et `@bottom-center` le numéro de page au format `N / Total`.

### Citations enchaînées

> La grille n'est pas une cage — c'est le silence entre les notes.

Un paragraphe intermédiaire pour espacer les deux citations et observer l'interaction entre le filet de citation et le rythme de la baseline. Le filet gauche de la blockquote mesure `--filet: 0.4mm`, et le padding gauche vaut `1.2M = 6mm`.

> Ce qui tient ensemble ce n'est pas la règle — c'est la cohérence du geste.

### Code et préformaté

Un extrait de code inline : `font-size: var(--t0)` correspond à 9 pt dans ce gabarit. Un bloc préformaté ci-dessous :

```
@page {
  size: A4;
  margin: 35mm 30mm 25mm;
}
```

Le bloc est composé en Courier New à 0,85em du corps, avec filet gauche 0,4 mm et padding 6 mm, identique à la blockquote — ce qui crée une cohérence visuelle entre les deux types d'encart.

---

Fin du spécimen.
