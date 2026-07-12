# Gabarits — créer et personnaliser vos modèles

Ce dossier contient les **gabarits** (feuilles de style qui décident de l'allure
d'un PDF) fournis avec Tampon. Tout ici est **à vous** : les fichiers sont des
copies éditables, et vos modifications prennent effet au tirage suivant.

## Comment un gabarit apparaît dans l'atelier

Règle unique : **tout fichier nommé `gabarit-<nom>.css` devient un choix dans le
menu déroulant**, sous l'étiquette `<nom>`. Rien d'autre à déclarer.

- `gabarit-rapport.css` → apparaît comme « rapport »
- `gabarit-lettre.css` → apparaît comme « lettre »

## Créer votre propre gabarit

1. Copiez un gabarit existant, par exemple `gabarit-rapport.css`, et renommez la
   copie `gabarit-<votre-nom>.css` (ex. `gabarit-affiche.css`).
2. Modifiez-le à votre goût. Il réapparaît automatiquement dans le menu au
   prochain tirage — inutile de redémarrer.
3. Écrivez votre document en Markdown (voir le dossier `examples/` à côté), puis
   choisissez votre gabarit dans l'atelier.

## Les fichiers partagés

- **`caracteres.css`** — les *réglages* communs : couleurs, corps de texte,
  marges, interlignage… regroupés en variables (`--corps`, `--marge-lr`, …).
  Changez une valeur ici et tous les gabarits qui l'importent suivent.
- **`habillage.css`** — l'habillage commun : tableaux, listes, code, filets,
  bandeaux d'en-tête et de pied de page.
- **`fonts/`** — les polices de caractères (`.ttf`). Déposez-y une nouvelle
  fonte, puis référencez-la dans un `@font-face` (voir `caracteres.css` pour un
  exemple). Les chemins sont relatifs à ce dossier : `url("fonts/MaFonte.ttf")`.

Les deux gabarits fournis commencent par `@import "caracteres.css";` et
`@import "habillage.css";` — reprenez ces deux lignes dans vos créations pour
hériter des réglages et de l'habillage communs.

## Bon à savoir

- Les PDF produits sont rangés dans `~/Documents/Tampon/` (le dossier parent).
- Désinstaller Tampon **ne supprime pas** ce dossier : vos gabarits et documents
  restent.
