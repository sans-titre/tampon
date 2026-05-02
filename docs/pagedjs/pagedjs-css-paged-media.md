# Paged.js — CSS Paged Media (référence)

> Source : W3C CSS Paged Media spec + Paged.js implementation

Les règles CSS utilisées dans les gabarits Tampon.

## @page — Définition des pages

```css
@page {
  size: A4;               /* format : A4, A5, letter, 210mm 297mm, … */
  margin: 20mm 15mm;      /* marges de page */
}

/* Première page différente */
@page :first {
  margin-top: 40mm;
}

/* Pages gauche/droite (recto-verso) */
@page :left  { margin-left: 25mm; }
@page :right { margin-right: 25mm; }
```

## Running elements — Éléments courants

Technique utilisée dans Tampon pour les bandeaux titre/date/auteur :

```css
/* Déclarer un élément comme "courant" */
.bandeau-titre-courant {
  position: running(titreCourant);
}

/* L'afficher dans la marge de page */
@page {
  @top-center {
    content: element(titreCourant);
  }
}
```

Zones de marge disponibles : `@top-left`, `@top-center`, `@top-right`, `@bottom-left`, `@bottom-center`, `@bottom-right`, `@left-top`, `@right-top`, etc.

## Compteurs de pages

```css
@page {
  @bottom-right {
    content: counter(page) " / " counter(pages);
  }
}
```

## Sauts de page

```css
h1 { break-before: page; }         /* saut avant chaque H1 */
.no-break { break-inside: avoid; } /* éviter de couper un bloc */
```

## Named pages

```css
.page-de-titre { page: titrePage; }

@page titrePage {
  margin: 0;
  @top-center { content: none; }
}
```

## Compatibilité Paged.js

Paged.js implémente la majorité des propriétés CSS Paged Media. Les gabarits Tampon (`gabarit-rapport.css`, `gabarit-lettre.css`) utilisent :
- `@page` avec `size` et `margin`
- `position: running(...)` pour les éléments courants
- `counter(page)` / `counter(pages)` pour la numérotation
- `break-before: page` pour les sauts de section
