# Prochaines étapes

## Acquis

L'expédition Linux est livrée : `make paquet` produit un `.deb` autonome
(binaire Bun compilé + chrome-headless-shell embarqué + client CDP natif),
validé sur Debian bookworm et Ubuntu 24.04. Voir
[expedition-deb.md](expedition-deb.md). La piste Electron explorée ici
auparavant est définitivement close (sandbox GUI + 330 Mo —
autopsie sur la branche `explore/electron-desktop`).

## Fonctionnalités (voir aussi idees_fonctionnalites_tampon.md)

1. **Mode lot** — sélectionner plusieurs `.md` et composer tous les tirages
   d'un coup (le serveur et `composer()` s'y prêtent déjà).
2. **Gestion des manuscrits** — conserver les `.md` sources et régénérer
   les PDFs après retouche d'un gabarit.
3. **Frontmatter complet** — lire `gabarit/titre/date/auteur` directement
   depuis le document collé (le formulaire ne ferait que pré-remplir).

## Distribution

- **Tarball portable** (`.tar.gz` du même payload) pour Fedora/Arch —
  quasi gratuit : l'arborescence `usr/lib/tampon` se réutilise telle quelle.
- **Mise à jour du moteur** : ré-épingler `CHS_VERSION` dans
  `scripts/deb/construire-deb-interne.sh` à chaque release et relancer
  `make test-deb`.
- **Long terme — Tauri** : toujours l'état de l'art documenté
  (`explore/pagedjs-tauri`, bundle < 10 Mo, WebView système) ; à réévaluer
  si le multi-plateforme (macOS/Windows) devient une vraie demande.
