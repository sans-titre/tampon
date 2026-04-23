# Exploration — distribution desktop via Electron

## Idée

Transformer Tampon en application desktop distribuable : un exécutable, un double-clic, une fenêtre. Zéro Docker, zéro terminal, zéro friction pour l'utilisateur final.

## Philosophie

Le modèle est celui des **apps desktop bundlées** (Electron, Tauri) : le serveur local tourne en arrière-plan, l'UI s'ouvre dans une fenêtre native, l'utilisateur ne voit rien de l'infrastructure.

Electron est l'option la plus cohérente ici pour une raison précise : **Chromium est déjà la dépendance fatale de Vivliostyle**. Electron embarque Chromium — on peut pointer Vivliostyle vers cette instance plutôt que d'en installer une séparée. Une seule copie de Chromium pour les deux usages.

## Ce qui change par rapport à v0.1

| v0.1 | Electron |
|---|---|
| Docker obligatoire | Binaire natif par OS |
| Navigateur système | Fenêtre Electron (WebView) |
| Chromium headless séparé | Chromium embarqué d'Electron (partagé) |
| Lancement via `docker compose up` | Double-clic |

## Ce qui ne change pas

Le pipeline intérieur reste identique : `server.ts`, `composer.ts`, Vivliostyle CLI, CSS Paged Media, `tirages/`. Electron est un wrapper autour de ce qui existe déjà.

## Architecture cible

![Architecture Electron](../rendus/architecture-electron.png)

## Décision — branche abandonnée

Cette piste est documentée comme référence mais **non retenue**. Electron reste une solution viable et cohérente (Chromium partagé entre l'UI et Vivliostyle), mais ce n'est pas l'état de l'art en 2026 — c'est le choix par défaut de 2015, pas le choix moderne.

Le vrai problème est en amont : **Vivliostyle impose Chromium**. Tant qu'on en dépend, on est condamné à embarquer un navigateur entier dans le bundle, ce qui interdit les approches légères (Tauri, WebView système).

La voie retenue est **Paged.js** — un renderer CSS Paged Media en JS pur, sans dépendance Chromium. Il tourne dans n'importe quelle WebView, ouvre la porte à Tauri, et est activement maintenu par le Consortium W3C. Voir `explore-pagedjs-desktop.md`.

## Points à creuser (archivé)

- **Vivliostyle → Chromium d'Electron** : Electron expose le chemin de son exécutable Chromium (`process.execPath` ou via `electron` package). Vivliostyle accepte `--executable-browser` — à valider que les deux s'entendent.
- **Bun comme processus enfant** : Electron Main lance `bun server.ts` via `child_process.spawn`, gère le cycle de vie (start/stop avec la fenêtre).
- **Packaging** : `electron-builder` ou `electron-forge` pour produire `.dmg`, `.exe`, `.AppImage`.
- **`tirages/`** : rediriger vers `~/Documents/Tampon/` ou équivalent OS plutôt qu'un chemin Docker.
- **Fonts** : embarquer Atkinson Hyperlegible dans le bundle plutôt que dépendre de `~/.local/share/fonts`.
